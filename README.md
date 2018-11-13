Disqus Webhooks Example: start consuming [Disqus webhooks](https://help.disqus.com/developer/webhooks) 
======================================================================

---

**Click `Show` (up top) to try the live demo right now, or `Remix this` to make it your own.**

Remixing instructions:
----------------------

1. Edit the parameters in `🗝.env` and in the url in `server.js`

```
    "https://disqus.com/api/3.0/forums/webhooks/create.json?"
    +"secret="+process.env.WEBHOOKS_SECRET_KEY
    +"&api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +"&forum=disqus-demo-pro"
    +"&url=https://disqus-webhook-example.glitch.me/webhook",
```

2. uncomment `// createSubscription()` to create a webhook subscription for the url specified with `url`


That's it! 🎉

**To see your webhooks roll in, click `"Show"` 👆 and leave a comment or vote in Disqus embed.**

This example remixed from [wistia-webhooks-example](https://glitch.com/~wistia-webhooks-example).