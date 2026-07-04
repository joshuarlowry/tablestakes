# TableStakes

Quick, blind-vote team games for a group on a call. Share a link, everyone's in
within seconds, and picks stay hidden until the whole room has locked in. No
accounts, no installs — just a browser.

**Live:** https://joshuarlowry.github.io/tablestakes/

## What's on the table

| Game | What it's for |
| --- | --- |
| **Story Pointing** | Estimate together, anchor-free (Fibonacci + ? / ☕). |
| **Fist to Five** | Gauge the room 0–5. |
| **Motion Vote** | Pose a question, vote yes / no / abstain. |
| **Ranked Choice** | Rank 2–10 options; tallied by Borda count. |
| **Health Check** | Rate team dimensions 🔴 / 🟡 / 🟢, blind. |
| **Turn Picker** | Rig-proof random pick via commit-reveal. |
| **Retrospective** | Went-well / didn't / actions (or start/stop/continue), blind or live, drag-free reordering. |
| **After-Action Review** | Planned / happened / why / next-time + a self-sorting timeline. |
| **Rock Paper Scissors** | The classic tiebreaker. |

Retro and AAR export to Markdown (copy or download).

## How it works

TableStakes is a **replicated-event app**, not a client/server one. Every client
runs the same pure reducer over a gossiped, order-independent event log
(CRDT-style), so all peers converge regardless of message order or duplication.
Blind picks use commit-reveal so no one — not even a relay — can peek early.

The only backend is a **dumb message relay**: it broadcasts opaque envelopes
between the sockets in a room and announces join/leave. It never sees game
logic. That relay sits behind a small transport *port* (`localPeerId`, `publish`,
`onEvent`, `onPeerJoin`, `onPeerLeave`, `leave`), so swapping the relay
implementation changes nothing else. There is **no WebRTC, STUN, or TURN** — the
relay *is* the transport.

```
src/game/      reducer, gossip, commit-reveal, registry, per-game logic (headless, tested)
src/games/     one logic module per game (no DOM)
src/ui/        DOM rendering + per-game UI modules
src/transports/wsRoom.js   the transport port → WebSocket relay
worker/        Cloudflare Worker + Durable Object relay (the hosted backend)
selfhost/      a Cloudflare-free relay you can run anywhere (see below)
test/          vitest suite incl. a mesh simulator for partition/convergence tests
```

## Develop

```sh
npm install
npm run dev         # vite dev server
npm run test:run    # full vitest suite
npm run build       # → dist/  (also mirrored to docs/ for GitHub Pages)
```

The relay URL is baked in at build time from `VITE_RELAY_URL` (falling back to
the hosted Worker). Point it wherever you like:

```sh
VITE_RELAY_URL="wss://relay.example.com" npm run build
```

---

## Self-hosting without Cloudflare (offline / on-prem)

The hosted site uses a Cloudflare Worker + Durable Object as its relay, but
**nothing about the app requires Cloudflare.** The relay is ~40 lines of "read a
JSON frame, rebroadcast it to the room." You can run the entire product — for a
LAN, an air-gapped network, or a licensed self-hosted install — with **one small
Node process** and **any static file server**. No cloud account, no database, no
TURN server.

### 1. Run the relay

A drop-in, dependency-light relay is included at [`selfhost/relay.js`](selfhost/relay.js).
It implements the exact same wire protocol as the Durable Object.

```sh
cd selfhost
npm install          # installs `ws`, its only dependency
PORT=8787 npm start  # → ws://0.0.0.0:8787   (path: /room/<roomId>)
```

Put it behind a TLS-terminating reverse proxy (nginx/Caddy) for `wss://` in
production. For a trusted LAN, plain `ws://` is fine.

### 2. Build the client pointed at your relay

```sh
# from the repo root
VITE_RELAY_URL="wss://relay.yourdomain.tld" npm run build      # public / TLS
# or, for a LAN box at 192.168.1.50:
VITE_RELAY_URL="ws://192.168.1.50:8787" npm run build
```

### 3. Serve the static files

`dist/` is fully static — serve it with anything:

```sh
npx serve dist
# or: python3 -m http.server --directory dist 8080
# or drop dist/ behind nginx / Caddy / IIS
```

> **Note on the base path.** The repo builds with `base: '/tablestakes/'` (for
> GitHub Pages). If you serve from a domain root instead, set `base: '/'` in
> `vite.config.js` before building.

That's it — open the served page, start a room, share the link, play. Everything
(game state, blind picks, exports) lives in the browsers; the relay only shuttles
bytes and remembers nothing once a room empties.

### What the relay does — and doesn't

- **Does:** per-room broadcast of opaque `evt` envelopes; join/leave announcements;
  invite-token gating (first socket in a room sets the token, later sockets must
  match).
- **Doesn't:** parse or store game state, run any game logic, need a database,
  need TURN/STUN, or phone home. Rooms are in-memory and vanish when the last
  peer leaves.

### Rolling your own relay

If you'd rather integrate the relay into an existing server (Go, Rust, Elixir,
whatever), you only need to honor this protocol. Connect at
`ws(s)://HOST/room/<roomId>`:

| Direction | Message | Meaning |
| --- | --- | --- |
| client → | `{t:'hello', id, token, name}` | join a room; first token in a room is authoritative |
| client → | `{t:'evt', payload, target?}` | broadcast, or unicast to `target` peer id |
| server → | `{t:'welcome', peers:[id,…]}` | sent to the joiner: who's already here |
| server → | `{t:'peer-join', id}` | a peer joined |
| server → | `{t:'peer-leave', id}` | a peer left |
| server → | `{t:'evt', from, payload}` | relayed event from peer `from` |

Reject a token mismatch by closing with code `4001`. The client reconnects with
backoff automatically. `payload` is opaque — never inspect it.

---

## The hosted Cloudflare backend (optional)

If you *do* want the Cloudflare deployment, it lives in [`worker/`](worker):
`worker/src/index.js` routes `/room/*` to the `RoomDO` Durable Object in
`worker/src/room.js` (the same relay, using the WebSocket Hibernation API with a
12-hour idle-cleanup alarm). Deploy with `wrangler deploy` from `worker/`. The
free-plan Durable Object migration uses `new_sqlite_classes` (see
`worker/wrangler.toml`).

## License

TODO — choose a license before distributing.
