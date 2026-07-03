# TableStakes TURN Worker

Mints short-lived Cloudflare Realtime TURN credentials so the browser never
holds the long-lived API token.

## Contract

- **Request:** `POST /` from an allowed origin (CORS-enforced).
- **Response:** JSON `iceServers` payload, ready to drop into
  `RTCPeerConnection({ iceServers })`.

The client side lives in [`src/transports/iceProviders.js`](../src/transports/iceProviders.js)
(the `cloudflare` provider). Endpoint URL is configured in
[`src/transports/turnConfig.js`](../src/transports/turnConfig.js).

## Provisioning (one-time, done outside this repo)

1. Cloudflare dashboard → **Realtime → TURN** → create a key.
   Note the **TURN key id** and **API token**.
2. Create a Cloudflare **API token** with *Workers Scripts: Edit* for CI deploys,
   and grab your **Account ID**.

## Secrets

Runtime (Worker) secrets — uploaded automatically by CI, or manually:

```sh
wrangler secret put TURN_KEY_ID
wrangler secret put TURN_KEY_API_TOKEN
```

GitHub Actions secrets (for the deploy workflow):

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploy the Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Target account |
| `TURN_KEY_ID` | Uploaded to the Worker at deploy |
| `TURN_KEY_API_TOKEN` | Uploaded to the Worker at deploy |

## Deploy

CI deploys on push to `main` touching `worker/**`. To deploy by hand:

```sh
cd worker
wrangler deploy
```

## Swapping providers

Replace `mintIceServers()` in `src/index.js`. The client contract (POST →
`iceServers` JSON) does not change, so no client edits are needed.
