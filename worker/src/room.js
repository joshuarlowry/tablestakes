/**
 * Minimal Durable Object smoke test — proves the Cloudflare account/token we
 * already have (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID) can provision a
 * Durable Object namespace, before building the real room-relay logic on it.
 */
export class RoomDO {
  constructor(state, env) {
    this.state = state;
  }
  async fetch(request) {
    return new Response('room-do-ok');
  }
}
