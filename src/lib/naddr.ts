import { DecodedNaddr } from "@/types";

// --- Bech32 encoding/decoding ---

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = (chk >> 25) & 0xff;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) >> 5);
  }
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) & 31);
  }
  return ret;
}

function bech32VerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === 1;
}

function bech32Decode(bech: string): { hrp: string; data: number[] } | null {
  const pos = bech.lastIndexOf("1");
  if (pos < 1 || pos + 7 > bech.length) return null;

  const hrp = bech.substring(0, pos).toLowerCase();
  const data: number[] = [];
  for (let i = pos + 1; i < bech.length; i++) {
    const d = BECH32_CHARSET.indexOf(bech[i].toLowerCase());
    if (d === -1) return null;
    data.push(d);
  }

  if (!bech32VerifyChecksum(hrp, data)) return null;
  return { hrp, data: data.slice(0, -6) };
}

function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;

  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    return null;
  }

  return ret;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// TLV types for naddr
const TLV_SPECIAL = 0; // relay
const TLV_AUTHOR = 2; // pubkey
const TLV_KIND = 3; // kind number

// --- Decode naddr ---

export function decodeNaddr(naddr: string): DecodedNaddr | null {
  try {
    const decoded = bech32Decode(naddr);
    if (!decoded || decoded.hrp !== "naddr") return null;

    const fiveBitData = decoded.data;
    const eightBitData = convertBits(fiveBitData, 5, 8, false);
    if (!eightBitData) return null;

    const data = new Uint8Array(eightBitData);

    let identifier = "";
    let pubkey = "";
    let kind = 0;
    let relays: string[] = [];

    let i = 0;
    while (i < data.length) {
      const type = data[i];
      const length = data[i + 1];

      if (i + 2 + length > data.length) break;

      const value = data.slice(i + 2, i + 2 + length);

      if (type === TLV_SPECIAL) {
        identifier = new TextDecoder().decode(value);
      } else if (type === TLV_AUTHOR) {
        pubkey = bytesToHex(value);
      } else if (type === TLV_KIND) {
        kind =
          (value[0] << 24) | (value[1] << 16) | (value[2] << 8) | value[3];
      } else if (type === 1) {
        relays.push(new TextDecoder().decode(value));
      }

      i += 2 + length;
    }

    if (!pubkey || !identifier) return null;

    return {
      kind: kind || 31890,
      pubkey,
      identifier,
      relays,
    };
  } catch {
    return null;
  }
}

// --- Decode note1 / nevent1 (NIP-18 & NIP-27 quote references) ---

export interface NeventInfo {
  eventId: string;
  relays: string[];
  author?: string;
  kind?: number;
}

/**
 * Decode a note1... bech32 string to a 64-char hex event ID.
 */
export function decodeNote1(note1: string): string | null {
  try {
    const clean = note1.replace(/^nostr:/i, "");
    if (!clean.startsWith("note1")) return null;
    const decoded = bech32Decode(clean);
    if (!decoded) return null;
    const bytes = convertBits(decoded.data, 5, 8, false);
    if (!bytes || bytes.length !== 32) return null;
    return bytesToHex(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

/**
 * Decode an nevent1... bech32 string to event ID + optional relay hints.
 */
export function decodeNevent1(nevent1: string): NeventInfo | null {
  try {
    const clean = nevent1.replace(/^nostr:/i, "");
    if (!clean.startsWith("nevent1")) return null;
    const decoded = bech32Decode(clean);
    if (!decoded) return null;
    const bytes = convertBits(decoded.data, 5, 8, false);
    if (!bytes) return null;
    const data = new Uint8Array(bytes);

    let eventId = "";
    const relays: string[] = [];
    let author: string | undefined;
    let kind: number | undefined;

    let i = 0;
    while (i < data.length) {
      const t = data[i];
      const len = data[i + 1];
      if (i + 2 + len > data.length) break;
      const val = data.slice(i + 2, i + 2 + len);

      if (t === 0 && len === 32) eventId = bytesToHex(val);
      else if (t === 1) relays.push(new TextDecoder().decode(val));
      else if (t === 2 && len === 32) author = bytesToHex(val);
      else if (t === 3 && len >= 4)
        kind = (val[0] << 24) | (val[1] << 16) | (val[2] << 8) | val[3];

      i += 2 + len;
    }

    if (!eventId || eventId.length !== 64) return null;
    return { eventId, relays, author, kind };
  } catch {
    return null;
  }
}

/**
 * Extract an event ID from any nostr: reference that points to a note.
 * Works with note1... and nevent1... prefixes.
 * Returns { eventId, relays } or null if not a note reference.
 */
export function decodeNostrNoteRef(
  ref: string
): { eventId: string; relays: string[] } | null {
  const clean = ref.replace(/^nostr:/i, "");
  if (clean.startsWith("note1")) {
    const eventId = decodeNote1(clean);
    return eventId ? { eventId, relays: [] } : null;
  }
  if (clean.startsWith("nevent1")) {
    const info = decodeNevent1(clean);
    return info ? { eventId: info.eventId, relays: info.relays } : null;
  }
  return null;
}

// --- Encode naddr ---

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) {
    ret.push((mod >> (5 * (5 - i))) & 31);
  }
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = [...data, ...bech32CreateChecksum(hrp, data)];
  return (
    hrp +
    "1" +
    combined.map((d) => BECH32_CHARSET[d]).join("")
  );
}

export function encodeNaddr(
  kind: number,
  pubkey: string,
  identifier: string,
  relays: string[] = []
): string {
  const tlv: number[] = [];

  const idBytes = new TextEncoder().encode(identifier);
  tlv.push(0, idBytes.length);
  tlv.push(...idBytes);

  for (const relay of relays) {
    const relayBytes = new TextEncoder().encode(relay);
    tlv.push(1, relayBytes.length);
    tlv.push(...relayBytes);
  }

  const authorBytes = hexToBytes(pubkey);
  tlv.push(2, 32);
  tlv.push(...authorBytes);

  tlv.push(
    3,
    4,
    (kind >> 24) & 0xff,
    (kind >> 16) & 0xff,
    (kind >> 8) & 0xff,
    kind & 0xff
  );

  const fiveBit = convertBits(tlv, 8, 5, true);
  if (!fiveBit) throw new Error("Failed to convert bits");

  return bech32Encode("naddr", fiveBit);
}

// --- Utilities ---

export function isNaddr(input: string): boolean {
  return /^naddr1[0-9a-z]+$/.test(input.toLowerCase());
}

export function extractNaddrFromPath(path: string): string | null {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (isNaddr(clean)) return clean;
  return null;
}

export function npubShort(pubkey: string): string {
  return pubkey.slice(0, 8) + "..." + pubkey.slice(-6);
}

export function npubFromHex(hex: string): string {
  if (hex.length !== 64) return hex;
  return hex.slice(0, 8) + "..." + hex.slice(-8);
}
