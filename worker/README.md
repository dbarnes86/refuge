# refuge-request

A Cloudflare Worker that takes founding pack requests from refuge.club and sends them through Resend:
the pack to the requester, from Dan at refuge.club, and a notification to hello@refuge.club with reply-to set to the requester.

## One-time setup

1. **Resend, add the domain.** Domains → Add domain → `refuge.club`. Add the DNS records it shows (DKIM, SPF and the `send` MX) wherever refuge.club's DNS lives, then press Verify.
2. **Resend, create a key.** API Keys → Create → name `refuge-request`, permission *Sending access*, domain `refuge.club`.
3. **Deploy the Worker.** From this folder:
   ```
   npx wrangler login
   npx wrangler secret put RESEND_API_KEY   # paste the key from step 2
   npx wrangler deploy
   ```
   Wrangler prints the Worker URL, e.g. `https://refuge-request.<account>.workers.dev`.
4. **Point the site at it.** In `index.html`, set `REQUEST_ENDPOINT` to that URL.

`dan@refuge.club` doesn't need to be a real mailbox to send from, but replies go to `hello@refuge.club` (set in `wrangler.toml`).

## Test

`node test.mjs` runs the Worker against a mocked Resend.
