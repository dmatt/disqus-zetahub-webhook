// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

const {getHash} = require('./signature-verification');
var http = require('http').Server(app);
var io = require('socket.io')(http);
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

const message = {

}

// http://sentry.local.disqus.net/disqus/default/group/681957/

function webhook(message) {
  console.log("webhook function")
  console.log(message)
  request.post(
    "https://disqus.com/api/3.0/forums/webhooks/create.json?"
    +"secret="+process.env.WEBHOOKS_SECRET_KEY
    +"&api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +"&forum=disqus-demo-pro"
    +"&url=https://disqus-webhook-example.glitch.me/create-webhook",
    { json: message },
    function (error, response, body) {
        console.log("webhook callback function")
        if (!error && response.statusCode == 200) {
            console.log(body)
        } else {
          console.log(body)
        }
    }
  );
}

// http://expressjs.com/en/starter/basic-routing.html
app.get("/create-webhook", function (request, response) {
  console.log("create page GET")
  webhook(message)
});

// Listen for incoming create webhook requests
app.post("/create-webhook", function (request, response, next) {

  const headers = request.headers
  const disqusSignature = headers['x-hub-signature'].replace("sha512=","")
  console.log("disqus signature: ", disqusSignature)
  
  const requestBody = request.body
  const computedHash = getHash(requestBody)
  console.log("The computed hash is: ", computedHash)
  
  // Verify that the webhook we want to create is legit, using the secret key
  if (disqusSignature === computedHash) {
    console.log("Signature looks good!")
    
    console.log("👤", JSON.parse(requestBody))
    // There can be multiple events. They're always in an array even if there's only one.
    // https://wistia.com/doc/webhooks#request_body
    
    /*
    events.forEach(function (event) {
      const payload = event.payload
      console.log(payload)
      // send this event payload to the client side with socket.io
      io.emit('event', payload)
    });
    */

    // Be sure to send a 200 OK response, to let Wistia know that all is well. 
    // Otherwise, Wistia will continue sending webhooks your way a few unnecessary times
    response.status(200).send(JSON.parse(requestBody).challenge)
    
  } else {
    console.log("Signature doesn't match. Ruh-roh.")
  }
});