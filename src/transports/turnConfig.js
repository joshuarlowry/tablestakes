/**
 * TURN configuration — the one place to change relay behavior.
 *
 * `buildRtcConfig()` is the only thing the app imports. It picks a provider,
 * asks it for ICE servers, and shapes them into an RTCConfiguration (or
 * `undefined` for a direct-only connection).
 *
 * Selection precedence (most specific wins):
 *   ?turnProvider= / ?turnEndpoint=   URL params (handy for one-off testing)
 *   localStorage overrides             persisted per browser
 *   VITE_* build-time defaults         baked into the deployed build
 */

import { getProvider } from './iceProviders.js';

const env = import.meta.env || {};

export const TURN_CONFIG = {
  defaultProvider: env.VITE_TURN_PROVIDER || 'cloudflare',
  cloudflareEndpoint: env.VITE_TURN_ENDPOINT || '',
};

function override(param, storageKey) {
  const fromUrl = new URLSearchParams(location.search).get(param);
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

function selectedProviderId() {
  return override('turnProvider', 'tablestakes:turnProvider') || TURN_CONFIG.defaultProvider;
}

function turnEndpoint() {
  return override('turnEndpoint', 'tablestakes:turnEndpoint') || TURN_CONFIG.cloudflareEndpoint;
}

/**
 * @param {{useTurn: boolean, forceRelay: boolean}} opts
 * @returns {Promise<RTCConfiguration | undefined>}
 * @throws if a relay was requested but the provider could not supply servers.
 */
export async function buildRtcConfig({ useTurn, forceRelay }) {
  if (!useTurn) return undefined;

  const provider = getProvider(selectedProviderId());
  const iceServers = await provider.getIceServers({ endpoint: turnEndpoint() });
  if (!iceServers.length) return undefined;

  return {
    iceServers,
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
  };
}

export function activeProviderLabel() {
  return getProvider(selectedProviderId()).label;
}
