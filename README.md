Wistia Webhooks Example: start consuming [Wistia webhooks](https://wistia.com/doc/webhooks) in _no time_*
======================================================================

\* "no time" = about two minutes. We timed it!

---


Here's the fastest way to get this project up & running for yourself:

First, go to [the Beta page in your Wistia account settings](https://my.wistia.com/account/beta) to enable webhooks on your account, if you haven't already.

Then go to [the Webhooks page in your Wistia account](https://my.wistia.com/account/webhooks), and create a new webhook. Configure it like so:

* **POST URL**: `https//YOUR_GLITCH_PROJECT_SUBDOMAIN.glitch.me/webhooks`. Note: After remixing this project on Glitch, you'll get an automatically generated project name, which is also your subdomain.
* **Secret Key**: A string that you'll use to verify the authenticity of the requests your webhooks consumer recieves. This can be any string of text in the whole wide world.
* **Events**: Choose the events you're interested in. `viewing_session.play` is a good place to start.

Last two setup things:
1. Copy your Secret Key and paste it into the `.env` file here in Glitch, like `secret_key="best_secret_key_ever"`.
2. Replace the video embedded in `views/index.html` with a video from [your own Wistia account](https://my.wistia.com).

That's it! 🎉

To see your webhooks roll in, click 