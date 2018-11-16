// 👀 TODO: Test event creation, un-obfuscate PII, 

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
    +"secret="+process.env.WEBHOOKS_SECRET
    +"&api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +"&forum=disqus-demo-pro"
    +"&url=https://disqus-zetahub-webhook-example.glitch.me/webhook", function (error, response, body) {
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

// How vote and post notifications could work:
// if post[create || vote] has [parent || target], get that id.author.email and upsert into ZH
  // other events: `post`, `vote`, nested: `create`, `update`, `delete`
// get that ZH user id and add vote or post notification event to that user http://docs.zetaglobal.com/docs/track-an-event
// in ZetaHub trigger email on all new events

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
    +"api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +`&post=${event.transformed_data.parent}`, function (error, response, body) {
        console.log("getParentCommentcallback function")
        if (!error && response.statusCode == 200) {
          resolve([event, JSON.parse(body)])
        } else {
          reject(response)
        }
    }
  )
  }).catch(onRejected).then(createUserZh)
}

let createUserZh = (event) => { 
  return new Promise( (resolve, reject) => {
  let createUserOptions = {
      uri: `https://people.api.boomtrain.com/v1/person/disqus/email/${event[1].response.author.email}`,
      headers: {
        'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
      },
      body: JSON.stringify({ attributes: {}})
    }
    request.put(createUserOptions, function (error, response, body) {
      console.log("createUser callback function")
      if (!error && response.statusCode == 200) {
        resolve([event[0], JSON.parse(body).data.bsin])
      } else {
        reject(error)
      }
    });
  }).catch(onRejected).then(createEventZh)
};

let createEventZh = (userZh) => { new Promise( (resolve, reject) => {
  let createEventOptions = {
    uri: `https://events.api.boomtrain.com/event/disqus`,
    headers: {
      'Authorization': `Bearer ${process.env.ZETAHUB_ID_TOKEN}`
    },
    body: JSON.stringify({
      site_id: 'disqus',
      bsin: userZh[1],
      event_type: 'reply',
      resource_type: 'comment',
      properties: userZh[0]
      // resource_id: eventUserZh[0].transformed_data.id,
      // timestamp: eventUserZh[0].timestamp
    })
  }
  request.post(createEventOptions, function (error, response, body) {
    console.log("createEvent callback function")
    if (!error && response.statusCode == 200) {
      console.log("🐨🐨","Reply Notification Event created for ", createEventOptions ,"Response: ", body)
      resolve(body)
    } else {
      console.log(error)
      reject(error)
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

let onRejected = () => function(reason) {
   console.error(reason)
}

let eventFixture = { timestamp: 1542323311,

  transformed_data: 

   { forum: 'disqus-demo-pro',

     parent: 4197218512,

     isApproved: true,

     editableUntil: '2018-11-22T18:07:39',

     isFlagged: false,

     dislikes: 0,

     raw_message: 'al',

     threadData: 

      { feed: 'https://disqus-demo-pro.disqus.com/disqus_zetahub_webhook_example/latest.rss',

        author: '252699845',

        dislikes: 0,

        raw_message: '',

        isClosed: false,

        link: 'https://disqus-zetahub-webhook-example.glitch.me/',

        likes: 0,

        id: '7032233392',

        message: '',

        isSpam: false,

        isDeleted: false,

        category: '6859065',

        forum: 'disqus-demo-pro',

        title: 'disqus-zetahub-webhook-example',

        identifiers: [Array],

        posts: 50,

        clean_title: 'disqus-zetahub-webhook-example',

        slug: 'disqus_zetahub_webhook_example',

        signedLink: 'https://disq.us/?url=https%3A%2F%2Fdisqus-zetahub-webhook-example.glitch.me%2F&key=a4FtiByHUKTR_G_jsog_uA',

        validateAllPosts: false,

        createdAt: '2018-11-09T14:22:46',

        hasStreaming: false,

        highlightedPost: null },

     numReports: 0,

     likes: 0,

     sb: false,

     message: '<p>al</p>',

     isSpam: false,

     isHighlighted: false,

     canVote: false,

     thread: '7032233392',

     approxLoc: { lat: 37.750999450683594, lng: -97.8219985961914 },

     media: [],

     author: 

      { username: 'iamfrancisyo',

        disable3rdPartyTrackers: false,

        isPowerContributor: false,

        isPrimary: true,

        id: '21035893',

        profileUrl: 'https://disqus.com/by/iamfrancisyo/',

        about: 'Publisher Success @Disqus –– I\'m in your inbox, answerin\' your questions..',

        name: 'Daniel',

        url: '',

        isAnonymous: false,

        emailHash: '4c04069e1919278a4e73ffe6291d63fd',

        location: 'San Francisco, CA',

        isPrivate: true,

        signedUrl: '',

        joinedAt: '2012-01-10T16:38:08',

        email: 'd****@disqus.com',

        isVerified: true,

        avatar: [Object] },

     createdAt: '2018-11-15T18:07:39',

     id: '4197236362',

     points: 0,

     isDeletedByAuthor: false,

     isDeleted: false,

     isEdited: false,

     flags: 0,

     ipAddress: '***.***.***.246',

     moderationLabels: [] },

  object_type: 'post',

  verb: 'create' }

// FIXTURE: send the payload to the ZetaHub callback
// sendToZetaHub(eventFixture);

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