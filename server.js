// 👀 TODO: Set some attribites http://docs.zetaglobal.com/docs/create-or-update-a-person, then create email campaign in ZH?

// server.js
// where your node app starts

// init project
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

const {getHash} = require('./signature-verification');
let http = require('http').Server(app);
let io = require('socket.io')(http);
const request = require('request');

http.listen(process.env.PORT || 3000, function(){
  console.log('listening');
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

const options = {
  type: 'application/json'
}
app.use(bodyParser.raw(options));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

let authorizePayload = {
    "client_id": "FP3iP1blgJbdmmSRYS1I96byb1nXryTs",
    "username": process.env.ZETAHUB_USERNAME,
    "password": process.env.ZETAHUB_PASSWORD,
    "connection": "Username-Password-Authentication",
    "scope": "openid app_metadata name email user_id",
    "grant_type": "password"
}

let authorizeZetaHub = () => {
  console.log("authorizeZetaHub function")
  request.post(
    "https://boomtrain.auth0.com/oauth/ro",
    { json: authorizePayload },
    function (error, response, body) {
        console.log("authorizeZetaHub callback function")
        if (!error && response.statusCode == 200) {
            console.log(body)
        } else {
          console.log(body)
        }
    }
  );
}

// Uncomment to get ZetaHub JWT token for endpoints that require auth 
//authorizeZetaHub()

// No idea why this is failing with `request({json: {}})` method

let createSubscription = () => {
  console.log("webhook function")
  request.post("https://disqus.com/api/3.0/forums/webhooks/create.json?"
    +"secret="+process.env.WEBHOOKS_SECRET_KEY
    +"&api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +"&forum=disqus-demo-pro"
    +"&url=https://disqus-webhook-example.glitch.me/webhook", function (error, response, body) {
        console.log("webhook callback function")
        if (!error && response.statusCode == 200) {
            console.log(response)
        } else {
          console.log(response)
        }
    }
  );
}

// Uncomment to restart glitch app and create a subscription
// createSubscription()

// How vote and post notifications could work:
// if post[create || vote] has [parent || target], get that id.author.email and upsert into ZH
  // other events: `post`, `vote`, nested: `create`, `update`, `delete`
// get that ZH user id and add vote or post notification event to that user http://docs.zetaglobal.com/docs/track-an-event
// in ZetaHub trigger email on all new events

let hasEmail = (event) => {
  return event.transformed_data.author.email
}

let isVoteEvent = (event) => {
  return event.transformed_data.object_type === 'vote';
}

let isCommentEvent = (event) => {
  return event.transformed_data.object_type === 'comment';
}

let hasTarget = (event) => {
  return event.transformed_data.recipient || event.transformed_data.parent
}

let createUserZh = (event) => {
  let createUserOptions = {
    uri: `https://people.api.boomtrain.com/v1/person/disqus/email/${event.transformed_data.author.email}`,
    headers: {
      'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
    },
    body: JSON.stringify({ attributes: {}})
  }
  return new Promise( (resolve, reject) => {
    request.put(createUserOptions, function (error, response, body) {
        console.log("sendToZetaHub callback function")
        if (!error && response.statusCode == 200) {
          console.log(body)  
          resolve(body.user.bsin)
        } else {
          reject(error)
        }
    }
  );
  });
}

let createEventZh = (event, userZh) => {
  let createEventOptions = {
    uri: `https://events.api.boomtrain.com/event/disqus`,
    headers: {
      'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
    },
    body: JSON.stringify({
      site_id: 'disqus',
      bsin: userZh.bsin,
      event_type: 'reply',
      resource_type: 'comment',
      resource_id: event.transformed_data.id,
      timestamp: event.timestamp
    })
  }
  return new Promise( (resolve, reject) => {
        request.put(createEventOptions, function (error, response, body) {
        console.log("sendToZetaHub callback function")
        if (!error && response.statusCode == 200) {
          console.log(body)  
          resolve(body.eventId)
        } else {
          reject(error)
        }
    }
  );
  });
}

let sendToZetaHub = (event) => {
  if (hasEmail(event) && isCommentEvent(event) && hasTarget(event)) {
    createUserZh(event).then(createEventZh(event,))
  } else {
    console.log('hasEmail: ', hasEmail(event),'isCommentEvent: ', isCommentEvent(event),'isTarget: ', hasTarget(event));
  }
  
}



// Listen for incoming create webhook requests
app.post("/webhook", function (request, response, next) {

  const headers = request.headers
  // the header from Disqus is prepended with `sha512=` so remove this
  const disqusSignature = headers['x-hub-signature'].replace("sha512=","")
  console.log("disqus signature: ", disqusSignature)
  
  const requestBody = request.body
  const computedHash = getHash(requestBody)
  console.log("The computed hash is: ", computedHash)
  
  // Verify that the incoming webhook is legit, using the secret key this server provided during creation
  if (disqusSignature === computedHash) {
    console.log("Signature looks good!")
    
    console.log("👤", JSON.parse(requestBody))
    // Disqus webhook documentation https://disqus.com/api/docs/forums/webhooks/
    
    // send the payload to the client side with socket.io
    io.emit('event', JSON.parse(requestBody))
    
    // send the payload to the ZetaHub callback
    sendToZetaHub(JSON.parse(requestBody));

    // Be sure to send a 200 OK response, to let Wistia know that all is well. 
    // Otherwise, Wistia will continue sending webhooks your way a few unnecessary times
    response.status(200).send(JSON.parse(requestBody).challenge)
    
  } else {
    console.log("Signature doesn't match. Ruh-roh.")
  }
});