// This is just pared-down Glitch project boilerplate. 
// You probably don't need to modify this for a simple Wistia support demo page.


// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const {getHash} = require('./signature-verification')
var http = require('http').Server(app)
var io = require('socket.io')(http)

http.listen(4000, function(){
  console.log('listening on *:4000');
});


// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// https://expressjs.com/en/api.html#req.body
// app.use(bodyParser.json()); // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const options = {
  type: 'application/json'
}
app.use(bodyParser.raw(options));


// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


// Listen for new viewing sessions.
// This requires setting up a webhook in Wistia, https://wistia.com/doc/webhooks,
// with the POST URL set to https://wistiabot.glitch.me/viewing_sessions

app.post("/viewing_sessions", upload.array(), function (request, response, next) {

  const headers = request.headers
  const wistiaSignature = headers['x-wistia-signature']
  console.log("wistia signature: ", wistiaSignature)
  
  const requestBody = request.body
  const computedHash = getHash(requestBody)
  console.log("The computed hash is: ", computedHash)
  
  if (wistiaSignature === computedHash) {
      
    console.log("Signature looks good!")
    
    const events = JSON.parse(requestBody).events
    // There can be multiple events. They're always in an array even if there's only one.
    // https://wistia.com/doc/webhooks#request_body
    for (var i = 0, numberOfEvents = events.length; i < numberOfEvents; i++) {
      const payload = events[i].payload
      console.log(payload)
      io.emit('event', payload)
      const payloadText = JSON.stringify(payload)
      const mediaName = payload.media.name
      const messageText = "Somebody watched " + mediaName + "!" + "```" + payloadText + "```"
      const titleLink = "https://dave.wistia.com/medias/" + payload.media.id;
      const viewerLink = "https://dave.wistia.com/stats/viewer/" + payload.visitor.id;
    }

    // Be sure to send a 200 OK response, to let Wistia know that all is well. 
    // Otherwise, Wistia will continue sending webhooks your way a few unnecessary times
    response.sendStatus(200) 
    
  } else {
    console.log("Signature doesn't match. Ruh-roh.")
  }
});

// var events = []

// const showEvent = (event) => {
//   events.push(event)
// }