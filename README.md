Wistia Webhooks Example: start consuming [Wistia webhooks](https://wistia.com/doc/webhooks) in _no time_*
======================================================================

\* "no time" = about two minutes

---

Webhooks are a simple way to let your application hear about stuff when it happens in Wistia. 

This app recieves Wistia webhooks when you [play the video](https://wistia-webhooks-example.glitch.me?wtime=0s), and logs each payload to the console on the page as they come in.

**Click `Show` to see the live demo right now, or [`remix this`] to make it your own.**

Remixing instructions:
----------------------

Here's the fastest way to get this project up & running for your own Wistia account:

First, go to [the Beta page in your Wistia account settings](https://my.wistia.com/account/beta) to enable webhooks on your account, if you haven't already.

Then go to [the Webhooks page in your Wistia account](https://my.wistia.com/account/webhooks), and create a new webhook. Configure it like so:

* **POST URL**: `https//YOUR_GLITCH_PROJECT_SUBDOMAIN.glitch.me/webhooks`
* **Secret Key**: A string that you'll use to verify the authenticity of the requests your webhooks consumer recieves. This can be any string of text in the whole wide world.
* **Events**: Choose the events you're interested in. `viewing_session.play` is a good place to start. This demo is built to show `viewing_session` events.

Last two setup things:
1. Copy your Secret Key and paste it into the `.env` file here in Glitch, like `WEBHOOKS_SECRET_KEY="best_secret_key_ever_I_tell_ya"`.
2. Replace the video embedded in `views/index.html` with a video from [your own Wistia account](https://my.wistia.com).

That's it! 🎉

To see your webhooks roll in, click `"Show"` 👆 and play your video.