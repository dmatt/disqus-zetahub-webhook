// TODO: function that periodically refreshes ZH token and stores it

// server.js
// where your node app starts

// init project
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

const {getHash} = require('./signature-verification');
const {testData} = require('./test-event');
let http = require('http').Server(app);
let io = require('socket.io')(http);
const request = require('request');
const flatten = require('flat');
const glitchup = require('glitchup');
glitchup();

// Use this inplace of a real webhook event for quick testing
let fakeEvent = testData;

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
    
    try {
      request.post(
        "https://boomtrain.auth0.com/oauth/ro",
        { json: authorizePayload }, function (error, response, body) {
            console.log("authorizeZetaHub callback function", body)
        });
    } catch(e) {
      console.error(e)
    }
}

// Uncomment to get ZetaHub JWT token for endpoints that require auth 
// authorizeZetaHub()

// No idea why this is failing with `request({json: {}})` method

let createSubscription = () => {
  console.log("webhook function")
  request.post("https://disqus.com/api/3.0/forums/webhooks/create.json?"
    +"secret="+process.env.DISQUS_WEBHOOKS_SECRET
    +"&api_key="+process.env.DISQUS_PUBLIC_KEY
    +"&access_token="+process.env.DISQUS_ACCESS_TOKEN
    +"&forum="+process.env.DISQUS_SHORTNAME
    +"&url=https://"+process.env.GLITCH_DOMAIN+".glitch.me/webhook", function (error, response, body) {
        console.log("webhook callback function")
        if (!error && response.statusCode == 200) {
            console.log(response)
        } else {
          console.log(response)
        }
    }
  );
}

// createSubscription()

// The Disqus -> Webhook -> Glitch -> Zetahub flow works like this:
// if event post[create] has [parent], get that id.author.email and upsert into ZH
  // other possible webhook events: `post`, `vote`, nested: `create`, `update`, `delete`
// get that ZH bsin and add post notification event object to that user as an event property http://docs.zetaglobal.com/docs/track-an-event
// in ZetaHub configure a triggered email for all new events

// Some checks on the event for some simple filtering of votes and comments without emails
let hasEmail = (event) => {
  return event.transformed_data.author.email
}

let isVoteEvent = (event) => {
  return event.object_type === 'vote';
}

let isCommentEvent = (event) => {
  return event.object_type === 'post';
}

let hasTarget = (event) => {
  return event.transformed_data.recipient || event.transformed_data.parent
}

let getParentComment = (event) => { 
  return new Promise( (resolve, reject) => {
    console.log(event.transformed_data.parent)
  request.get("https://disqus.com/api/3.0/posts/details.json?"
    +"api_key="+process.env.DISQUS_PUBLIC_KEY
    +"&access_token="+process.env.DISQUS_ACCESS_TOKEN
    +`&post=${event.transformed_data.parent}`, function (error, response, body) {
        console.log("getParentCommentcallback function")
        if (!error && response.statusCode == 200) {
          resolve([event, JSON.parse(body)])
        } else {
          reject(body)
        }
    }
  )
  }).catch(onRejected).then(createUserZh)
}

let createUserZh = (event) => { 
  return new Promise( (resolve, reject) => {
    // Flatten the JSON object for so ZH treats each key as a User attribute
    let flattenedEvent = flatten(event[0].transformed_data)
    let createUserOptions = {
      uri: `https://people.api.boomtrain.com/v1/person/${process.env.ZETAHUB_SITE_ID}/email/${event[1].response.author.email}`,
      headers: {
        'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
      },
      body: JSON.stringify({ attributes: flattenedEvent})
    }
    request.put(createUserOptions, function (error, response, body) {
      console.log("createUser callback function")
      if (!error && response.statusCode == 200) {
        resolve([event[0], JSON.parse(body).data.bsin])
      } else {
        reject(body)
      }
    });
  }).catch(onRejected).then(createEventZh)
};

let createEventZh = (userZh) => { new Promise( (resolve, reject) => {
  let createEventOptions = {
    uri: `https://events.api.boomtrain.com/event/${process.env.ZETAHUB_SITE_ID}`,
    headers: {
      'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
    },
    body: JSON.stringify({
      site_id: process.env.ZETAHUB_SITE_ID,
      bsin: userZh[1],
      event_type: 'reply',
      resource_type: 'comment',
      resource_id: userZh[0].transformed_data.id,
      timestamp: userZh[0].timestamp,
      properties: userZh[0],
    })
  }
  request.post(createEventOptions, function (error, response, body) {
    console.log("createEvent callback function")
    if (!error && response.statusCode == 200) {
      console.log("🐨","Reply Notification Event created for ", createEventOptions ,"Response: ", body)
      resolve(body)
    } else {
      console.log(error)
      reject(body)
    }
  });
}).catch(onRejected)};

let sendToZetaHub = (event) => {
  if (hasEmail(event) && isCommentEvent(event) && hasTarget(event)) {
    getParentComment(event)
  } else {
    console.error('hasEmail: ', hasEmail(event),'isCommentEvent: ', isCommentEvent(event),'isTarget: ', hasTarget(event));
  }
}

let onRejected = (reason) => {
   console.error(reason)
}

// Testing, bypass the webhook listener
sendToZetaHub(fakeEvent);

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