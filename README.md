Disqus Webhooks Example: start consuming [Disqus webhooks]() in _no time_*
======================================================================

---

**Click `Show` (up top) to try the live demo right now, or `Remix this` to make it your own.**

Remixing instructions:
----------------------

1. Edit

```
    "https://disqus.com/api/3.0/forums/webhooks/create.json?"
    +"secret="+process.env.WEBHOOKS_SECRET_KEY
    +"&api_key="+process.env.WEBHOOKS_PUBLIC_KEY
    +"&access_token="+process.env.WEBHOOKS_ACCESS_TOKEN
    +"&forum=disqus-demo-pro"
    +"&url=https://disqus-webhook-example.glitch.me/webhook",
```

2. uncomment `// createSubscription()` to create 1 subscription


That's it! 🎉

**To see your webhooks roll in, click `"Show"` 👆 and leave a comment or vote in Disqus embed.**