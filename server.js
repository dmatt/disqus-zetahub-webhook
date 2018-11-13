// 👀 TODO: function for creating ZH users Add http://docs.zetaglobal.com/

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
// authorizeZetaHub()

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



let sendToZetaHub = (event) => {
  console.log("sendToZetaHub function", event)
  let email = 'dmatt+glitch@disqus.com';
  let createUserOptions = {
    headers: {
      'Authorization': `Bearer ${process.env.ZETAHUB_ACCESS_TOKEN}`
    },
    body: { attributes: {}}
  }
  request.put("https://people.api.boomtrain.com/v1/person/disqus/dmatt+glitch@disqus.com/", createUserOptions, function (error, response, body) {
        console.log("sendToZetaHub callback function")
        if (!error && response.statusCode == 200) {
            console.log(body)
        } else {
          console.log(body)
        }
    }
  );
  console.log(event)
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