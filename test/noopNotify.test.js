import { describe, it, expect } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';

// Regression: heartbeat() and tick() used to call every onChange listener
// unconditionally, even when nothing about the derived view changed. In the
// browser that meant main.js replaced the whole stage's innerHTML on every
// 5s heartbeat / 2s tick, destroying a focused <input> mid-keystroke (and
// dismissing the mobile keyboard) even though the facilitator was just typing
// into a local, unsynced config draft.
describe('no-op notify suppression', () => {
  it('a repeated identical heartbeat does not notify listeners', async () => {
    const mesh = createMesh();
    const a = createGameClient({ transport: mesh.transportFor('a'), name: 'Ana', now: () => 1000 });
    let notifications = 0;
    a.onChange(() => { notifications += 1; });

    a.join();               // first presence: a real change, notifies once
    mesh.flush();
    expect(notifications).toBe(1);

    notifications = 0;
    a.heartbeat();           // same name, same peer, nothing about the view changes
    mesh.flush();
    a.heartbeat();
    mesh.flush();
    a.tick();
    a.tick();
    expect(notifications).toBe(0);
  });

  it('a genuinely new peer joining still notifies', async () => {
    const mesh = createMesh();
    const a = createGameClient({ transport: mesh.transportFor('a'), name: 'Ana', now: () => 1000 });
    const b = createGameClient({ transport: mesh.transportFor('b'), name: 'Ben', now: () => 1000 });
    mesh.connect('a', 'b');
    let notifications = 0;
    a.onChange(() => { notifications += 1; });

    a.join();
    mesh.flush();
    notifications = 0;
    b.join();                // a genuinely new participant — must notify
    mesh.flush();
    expect(notifications).toBeGreaterThan(0);
  });
});
