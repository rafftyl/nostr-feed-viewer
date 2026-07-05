// ─── Nostr Event Types ───────────────────────────────────────────────────────

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Profile {
  pubkey: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

// ─── Coracle Feed DSL Types ──────────────────────────────────────────────────

export enum FeedType {
  Address = "address",
  Author = "author",
  CreatedAt = "created_at",
  DVM = "dvm",
  Difference = "difference",
  ID = "id",
  Intersection = "intersection",
  Global = "global",
  Kind = "kind",
  List = "list",
  Label = "label",
  WOT = "wot",
  Relay = "relay",
  Scope = "scope",
  Search = "search",
  Tag = "tag",
  Union = "union",
}

export type FeedDefinition = [FeedType, ...any[]];

export interface FeedMetadata {
  title: string;
  description: string;
  identifier: string;
  definition: FeedDefinition;
  author: string;
}

// ─── Compiled Filter ─────────────────────────────────────────────────────────

export interface CompiledFilter {
  kinds?: number[];
  authors?: string[];
  ids?: string[];
  "#t"?: string[];
  "#p"?: string[];
  "#e"?: string[];
  "#a"?: string[];
  "#d"?: string[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
  [key: string]: any; // Allow arbitrary tag filters
}

export interface RelayRequest {
  relays: string[];
  filters: CompiledFilter[];
}

// ─── naddr Decoded ───────────────────────────────────────────────────────────

export interface DecodedNaddr {
  kind: number;
  pubkey: string;
  identifier: string;
  relays: string[];
}

// ─── Tidal Widget ────────────────────────────────────────────────────────────

export interface TidalInfo {
  type: "track" | "album" | "playlist";
  id: string;
  url: string;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppState {
  feed: FeedMetadata | null;
  events: NostrEvent[];
  profiles: Map<string, Profile>;
  loading: boolean;
  error: string | null;
}
