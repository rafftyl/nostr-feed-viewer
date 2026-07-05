import { NostrEvent, RelayRequest, CompiledFilter } from "@/types";

// ─── Relay Pool ──────────────────────────────────────────────────────────────

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
  "wss://nostr.mom",
  "wss://relayable.org",
];

type SubCallback = (event: NostrEvent) => void;
type EoseCallback = () => void;

interface ActiveSub {
  onEvent: SubCallback;
  onEose?: EoseCallback;
}

interface RelayConnection {
  ws: WebSocket;
  url: string;
  connected: boolean;
  queue: string[];
  subs: Map<string, ActiveSub>;
}

const connections = new Map<string, RelayConnection>();

function getRelayUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function connectToRelay(url: string): Promise<RelayConnection> {
  const cleanUrl = getRelayUrl(url);
  const existing = connections.get(cleanUrl);
  if (existing?.connected) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(cleanUrl);
    const conn: RelayConnection = {
      ws,
      url: cleanUrl,
      connected: false,
      queue: [],
      subs: new Map(),
    };

    // Single message handler dispatches to all active subs
    ws.onmessage = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT") {
          const subId = data[1];
          const event: NostrEvent = data[2];
          const sub = conn.subs.get(subId);
          sub?.onEvent(event);
        } else if (data[0] === "EOSE") {
          const subId = data[1];
          const sub = conn.subs.get(subId);
          sub?.onEose?.();
        } else if (data[0] === "NOTICE") {
          console.warn(`Relay ${cleanUrl} notice:`, data[1]);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onopen = () => {
      conn.connected = true;
      for (const msg of conn.queue) {
        ws.send(msg);
      }
      conn.queue = [];
      connections.set(cleanUrl, conn);
      resolve(conn);
    };

    ws.onerror = () => {
      reject(new Error(`Failed to connect to ${cleanUrl}`));
    };

    ws.onclose = () => {
      conn.connected = false;
      connections.delete(cleanUrl);
    };
  });
}

function sendToRelay(conn: RelayConnection, message: string) {
  if (conn.connected) {
    conn.ws.send(message);
  } else {
    conn.queue.push(message);
  }
}

export async function subscribeToRelay(
  url: string,
  filter: CompiledFilter,
  onEvent: SubCallback,
  onEose?: EoseCallback
): Promise<() => void> {
  const subId = `sub_${Math.random().toString(36).slice(2, 9)}`;
  const cleanUrl = getRelayUrl(url);

  const conn = await connectToRelay(cleanUrl);

  conn.subs.set(subId, { onEvent, onEose });

  const req = JSON.stringify(["REQ", subId, filter]);
  sendToRelay(conn, req);

  return () => {
    const close = JSON.stringify(["CLOSE", subId]);
    sendToRelay(conn, close);
    conn.subs.delete(subId);
  };
}

// ─── Multi-Relay Subscription ────────────────────────────────────────────────

export async function fetchEvents(
  relays: string[],
  filters: CompiledFilter[],
  timeout = 15000
): Promise<NostrEvent[]> {
  const events = new Map<string, NostrEvent>();
  const cleanRelays = relays.map(getRelayUrl).filter(Boolean);
  const uniqueRelays = [...new Set([...cleanRelays, ...DEFAULT_RELAYS])];

  const promises = uniqueRelays.map(async (relayUrl) => {
    try {
      for (const filter of filters) {
        await new Promise<void>(async (resolve) => {
          const timer = setTimeout(resolve, timeout);
          try {
            const unsub = await subscribeToRelay(
              relayUrl,
              filter,
              (event) => {
                events.set(event.id, event);
              },
              () => {
                clearTimeout(timer);
                unsub();
                resolve();
              }
            );
            // Clean up after timeout as a fallback
            setTimeout(() => {
              try { unsub(); } catch {}
              resolve();
            }, timeout);
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
      }
    } catch {
      // Relay failed, continue with others
    }
  });

  await Promise.allSettled(promises);
  return Array.from(events.values());
}

// ─── Fetch Single Event ──────────────────────────────────────────────────────

export async function fetchEventByAddress(
  kind: number,
  pubkey: string,
  identifier: string,
  relays: string[] = []
): Promise<NostrEvent | null> {
  const filter: CompiledFilter = {
    kinds: [kind],
    authors: [pubkey],
    "#d": [identifier],
    limit: 1,
  };

  const events = await fetchEvents(relays, [filter], 10000);
  return events[0] || null;
}

// ─── Fetch Profiles ──────────────────────────────────────────────────────────

export async function fetchProfiles(
  pubkeys: string[],
  relays: string[] = []
): Promise<Map<string, NostrEvent>> {
  const profiles = new Map<string, NostrEvent>();
  const uniquePubkeys = [...new Set(pubkeys)];

  if (uniquePubkeys.length === 0) return profiles;

  // Batch in chunks of 100
  for (let i = 0; i < uniquePubkeys.length; i += 100) {
    const chunk = uniquePubkeys.slice(i, i + 100);
    const filter: CompiledFilter = {
      kinds: [0],
      authors: chunk,
    };

    const events = await fetchEvents(relays, [filter], 10000);
    for (const event of events) {
      const existing = profiles.get(event.pubkey);
      if (!existing || event.created_at > existing.created_at) {
        profiles.set(event.pubkey, event);
      }
    }
  }

  return profiles;
}

export function parseProfile(event: NostrEvent): {
  pubkey: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
} {
  try {
    const metadata = JSON.parse(event.content);
    return {
      pubkey: event.pubkey,
      name: metadata.name,
      display_name: metadata.display_name,
      about: metadata.about,
      picture: metadata.picture,
      nip05: metadata.nip05,
    };
  } catch {
    return { pubkey: event.pubkey };
  }
}
