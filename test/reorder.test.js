import { describe, it, expect } from 'vitest';
import { createGameClient } from '../src/game/gameClient.js';
import { commit } from '../src/game/commitReveal.js';

// Regression: a peer's `reveal` can arrive before its `commit` (Trystero does
// not guarantee ordering across messages). Verification must be retried when the
// commit finally lands — otherwise the round is stuck forever. This reproduces
// the exact 2-tab hang caught in manual browser testing.
function mockPort(id) {
  let onEvt = () => {};
  return {
    localPeerId: id,
    publish() {},
    publishTo() {},
    onEvent(cb) { onEvt = cb; },
    onPeerJoin() {},
    onPeerLeave() {},
    deliver(ev) { onEvt(ev, ev.from); },
  };
}

const flushAsync = () => new Promise(r => setTimeout(r, 0));

describe('reveal arriving before its commit', () => {
  it('still reaches reveal once the commit lands (autoVerify)', async () => {
    const port = mockPort('b');
    const client = createGameClient({
      transport: port, name: 'Ben', autoVerify: true,
      now: () => 1000, randomNonce: () => 'nb',
    });

    port.deliver({ id: 'presence:a:0', type: 'presence', from: 'a', name: 'Ana', seq: 0 });
    client.join();
    port.deliver({ id: 'select:1:a', type: 'select-game', from: 'a', round: 1, game: 'rps' });
    await client.lock('rock');

    // Ana's REVEAL arrives first — no commit yet, so it can't be verified.
    port.deliver({ id: 'reveal:a:1', type: 'reveal', from: 'a', round: 1, pick: 'scissors', nonce: 'na' });
    await flushAsync();
    expect(client.getView().phase).toBe('pick');   // correctly still waiting

    // Ana's COMMIT lands later — must retrigger verification of the pending reveal.
    const aHash = await commit('scissors', 'na');
    port.deliver({ id: 'commit:a:1', type: 'commit', from: 'a', round: 1, hash: aHash });
    await flushAsync();
    await flushAsync();

    const v = client.getView();
    expect(v.phase).toBe('reveal');
    expect(v.result.winners).toEqual(['b']);        // rock beats scissors
  });
});
