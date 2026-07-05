import { FeedType, FeedDefinition, CompiledFilter, RelayRequest, NostrEvent } from "@/types";

// ─── Parse Feed Event ────────────────────────────────────────────────────────

export function parseFeedEvent(event: NostrEvent): {
  title: string;
  description: string;
  identifier: string;
  definition: FeedDefinition | null;
} {
  const tags = new Map<string, string>();
  for (const tag of event.tags) {
    if (tag.length >= 2) {
      tags.set(tag[0], tag[1]);
    }
  }

  const title = tags.get("title") || tags.get("alt") || "Untitled Feed";
  const description = tags.get("description") || "";
  const identifier = tags.get("d") || "";
  const feedStr = tags.get("feed") || "";

  let definition: FeedDefinition | null = null;
  if (feedStr) {
    try {
      definition = JSON.parse(feedStr);
    } catch {
      // If JSON parse fails, try to parse as a simple list reference
    }
  }

  return { title, description, identifier, definition };
}

// ─── Compile Feed Definition → Filters ───────────────────────────────────────

export function compileFeed(
  definition: FeedDefinition,
  context?: { pubkeys?: string[] }
): { filters: CompiledFilter[]; relays: string[] } {
  const result = compileNode(definition, context);
  return {
    filters: result.filters.length > 0 ? result.filters : [{ limit: 50 }],
    relays: result.relays,
  };
}

interface CompileResult {
  filters: CompiledFilter[];
  relays: string[];
}

function compileNode(
  def: FeedDefinition,
  context?: { pubkeys?: string[] }
): CompileResult {
  const [type, ...args] = def;

  switch (type as FeedType) {
    case FeedType.Kind: {
      const kinds = args.filter((a: any) => typeof a === "number");
      return {
        filters: [{ kinds: kinds.length > 0 ? kinds : [1], limit: 50 }],
        relays: [],
      };
    }

    case FeedType.Author: {
      const authors = args.filter(
        (a: any) => typeof a === "string" && a.length === 64
      );
      return {
        filters: [{ authors, limit: 50 }],
        relays: [],
      };
    }

    case FeedType.Tag: {
      const [key, ...values] = args;
      const tagName = key.startsWith("#") ? key : `#${key}`;
      return {
        filters: [{ [tagName]: values, limit: 50 } as CompiledFilter],
        relays: [],
      };
    }

    case FeedType.ID: {
      const ids = args.filter((a: any) => typeof a === "string");
      return {
        filters: [{ ids, limit: 50 }],
        relays: [],
      };
    }

    case FeedType.Address: {
      // Addresses are "kind:pubkey:d-tag" strings
      const ids = args.filter((a: any) => typeof a === "string");
      return {
        filters: [{ "#a": ids, limit: 50 } as CompiledFilter],
        relays: [],
      };
    }

    case FeedType.Relay: {
      const relays = args.filter((a: any) => typeof a === "string");
      return { filters: [{ limit: 50 }], relays };
    }

    case FeedType.Scope: {
      // Scope requires user context (follows list), fall back to global
      if (context?.pubkeys && context.pubkeys.length > 0) {
        return {
          filters: [{ authors: context.pubkeys, limit: 50 }],
          relays: [],
        };
      }
      return { filters: [{ limit: 50 }], relays: [] };
    }

    case FeedType.Search: {
      const query = args.find((a: any) => typeof a === "string") || "";
      return {
        filters: [{ search: query, limit: 50 }],
        relays: [],
      };
    }

    case FeedType.CreatedAt: {
      const since = args.find(
        (a: any) => typeof a === "object" && a.since
      )?.since;
      const until = args.find(
        (a: any) => typeof a === "object" && a.until
      )?.until;
      const filter: CompiledFilter = { limit: 50 };
      if (since) filter.since = since;
      if (until) filter.until = until;
      return { filters: [filter], relays: [] };
    }

    case FeedType.Global: {
      return { filters: [{ kinds: [1], limit: 50 }], relays: [] };
    }

    case FeedType.Intersection: {
      // AND: merge all sub-filters
      const subResults = (args as FeedDefinition[])
        .filter((a) => Array.isArray(a))
        .map((a) => compileNode(a, context));

      const relays = subResults.flatMap((r) => r.relays);

      // Get the max limit across all sub-filters
      const maxLimit = Math.max(
        ...subResults.flatMap((r) => r.filters.map((f) => f.limit || 50))
      );

      // Merge all filters into one (intersection)
      const merged: CompiledFilter = { limit: maxLimit };
      for (const result of subResults) {
        for (const filter of result.filters) {
          if (filter.kinds) {
            merged.kinds = merged.kinds
              ? merged.kinds.filter((k) => filter.kinds!.includes(k))
              : filter.kinds;
          }
          if (filter.authors) {
            merged.authors = merged.authors
              ? merged.authors.filter((a) => filter.authors!.includes(a))
              : filter.authors;
          }
          if (filter.ids) {
            merged.ids = merged.ids
              ? merged.ids.filter((i) => filter.ids!.includes(i))
              : filter.ids;
          }
          if (filter.search) merged.search = filter.search;
          if (filter.since) merged.since = filter.since;
          if (filter.until) merged.until = filter.until;

          // Handle tag filters
          for (const [key, value] of Object.entries(filter)) {
            if (key.startsWith("#")) {
              (merged as any)[key] = (merged as any)[key]
                ? (merged as any)[key].filter((v: string) =>
                    (value as string[]).includes(v)
                  )
                : value;
            }
          }
        }
      }

      return { filters: [merged], relays: [...new Set(relays)] };
    }

    case FeedType.Union: {
      // OR: concatenate all sub-filters
      const subResults = (args as FeedDefinition[])
        .filter((a) => Array.isArray(a))
        .map((a) => compileNode(a, context));

      const relays = subResults.flatMap((r) => r.relays);
      const filters = subResults.flatMap((r) => r.filters);

      return { filters, relays: [...new Set(relays)] };
    }

    case FeedType.Difference: {
      // Take first sub-feed only (difference is hard without set operations)
      if (args.length > 0 && Array.isArray(args[0])) {
        return compileNode(args[0] as FeedDefinition, context);
      }
      return { filters: [{ limit: 50 }], relays: [] };
    }

    case FeedType.List: {
      // List references require fetching another event; skip for now
      return { filters: [{ limit: 50 }], relays: [] };
    }

    case FeedType.WOT:
    case FeedType.DVM:
    case FeedType.Label: {
      // These require complex runtime resolution; fall back to recent notes
      return { filters: [{ kinds: [1], limit: 50 }], relays: [] };
    }

    default: {
      return { filters: [{ kinds: [1], limit: 50 }], relays: [] };
    }
  }
}

// ─── Human-Readable Feed Description ─────────────────────────────────────────

export function describeFeed(definition: FeedDefinition): string {
  const [type, ...args] = definition;

  switch (type as FeedType) {
    case FeedType.Kind:
      return `Posts of kind ${args.filter((a: any) => typeof a === "number").join(", ")}`;
    case FeedType.Author:
      return `Posts by ${args.filter((a: any) => typeof a === "string").length} author(s)`;
    case FeedType.Tag:
      return `Posts tagged with ${args.slice(1).join(", ")}`;
    case FeedType.Search:
      return `Search results for "${args.find((a: any) => typeof a === "string")}"`;
    case FeedType.Intersection:
      return `Combined: ${(args as FeedDefinition[])
        .filter((a) => Array.isArray(a))
        .map((a) => describeFeed(a))
        .join(" AND ")}`;
    case FeedType.Union:
      return `Either: ${(args as FeedDefinition[])
        .filter((a) => Array.isArray(a))
        .map((a) => describeFeed(a))
        .join(" OR ")}`;
    case FeedType.Scope:
      return `${args[0] || "network"} feed`;
    case FeedType.Global:
      return "Global feed";
    default:
      return `${type} feed`;
  }
}
