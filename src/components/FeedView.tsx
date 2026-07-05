"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NostrEvent, Profile, FeedMetadata } from "@/types";
import {
  fetchEvents,
  fetchProfilesStreaming,
  parseProfile,
} from "@/lib/nostr";
import { parseFeedEvent, compileFeed } from "@/lib/feed-parser";
import { decodeNaddr } from "@/lib/naddr";
import FeedHeader from "./FeedHeader";
import NoteCard from "./NoteCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";

interface FeedViewProps {
  naddr: string;
}

export default function FeedView({ naddr }: FeedViewProps) {
  const [feed, setFeed] = useState<FeedMetadata | null>(null);
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [phase, setPhase] = useState<
    "loading-feed" | "loading-posts" | "loading-profiles" | "done" | "error"
  >("loading-feed");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naddr]);

  const loadFeed = async () => {
    try {
      // ── Phase 1: Fetch the feed definition event ──
      setPhase("loading-feed");

      const decoded = decodeNaddr(naddr);
      if (!decoded) throw new Error("Invalid naddr format");

      const feedEvents = await fetchEvents(
        decoded.relays,
        [
          {
            kinds: [decoded.kind],
            authors: [decoded.pubkey],
            "#d": [decoded.identifier],
            limit: 1,
          },
        ],
        15000
      );

      if (feedEvents.length === 0) throw new Error("Feed not found");

      const feedEvent = feedEvents[0];
      const { title, description, definition } = parseFeedEvent(feedEvent);

      const feedMetadata: FeedMetadata = {
        title,
        description,
        identifier: decoded.identifier,
        definition: definition!,
        author: decoded.pubkey,
      };

      setFeed(feedMetadata);
      if (!definition) throw new Error("Invalid feed definition");

      // ── Phase 2: Stream content events as they arrive ──
      setPhase("loading-posts");

      const { filters, relays } = compileFeed(definition);
      const seenIds = new Set<string>();

      await fetchEvents(
        [...decoded.relays, ...relays],
        filters,
        20000,
        // onEvent callback — fires for every new event from any relay
        (event) => {
          if (seenIds.has(event.id)) return;
          seenIds.add(event.id);
          // Insert sorted by created_at descending
          setEvents((prev) => {
            const next = [...prev, event];
            next.sort((a, b) => b.created_at - a.created_at);
            return next;
          });
          setPostCount((c) => c + 1);
        }
      );

      // ── Phase 3: Stream profiles as they arrive ──
      setPhase("loading-profiles");

      // Gather all unique pubkeys from the events we collected
      const currentEvents = Array.from(seenIds).length;
      // Re-read events from state won't work inside async, use the collected set
      // Instead, collect pubkeys as we go
      const pubkeys = new Set<string>();

      // We need to re-read the events we've accumulated to get pubkeys
      // Since setEvents is async, let's collect pubkeys during event collection
      // Actually, let's fetch profiles for all events we have
      setEvents((prev) => {
        prev.forEach((e) => pubkeys.add(e.pubkey));
        return prev;
      });

      // Small delay to let setEvents flush
      await new Promise((r) => setTimeout(r, 50));

      // Collect pubkeys from current events
      setEvents((prev) => {
        prev.forEach((e) => pubkeys.add(e.pubkey));
        return prev;
      });

      await fetchProfilesStreaming(
        [...pubkeys],
        decoded.relays,
        (pubkey, profileEvent) => {
          const profile = parseProfile(profileEvent);
          setProfiles((prev) => {
            const next = new Map(prev);
            next.set(pubkey, profile);
            return next;
          });
        }
      );

      setPhase("done");
    } catch (err: any) {
      console.error("Failed to load feed:", err);
      setErrorMsg(err.message || "Failed to load feed");
      setPhase("error");
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (phase === "loading-feed") {
    return <LoadingSpinner message="Fetching feed definition..." />;
  }

  if (phase === "error" && !feed) {
    return <ErrorDisplay message={errorMsg || "Feed not found"} onRetry={loadFeed} />;
  }

  if (!feed) {
    return <ErrorDisplay message="Feed not found" onRetry={loadFeed} />;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isLoading = phase === "loading-posts" || phase === "loading-profiles";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <FeedHeader feed={feed} eventCount={events.length} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Inline loading banner */}
        {isLoading && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 animate-fade-in">
            <div className="relative flex-shrink-0">
              <div className="w-4 h-4 rounded-full border-2 border-purple-300 dark:border-purple-600 border-t-purple-600 dark:border-t-purple-300 animate-spin" />
            </div>
            <span className="text-sm text-purple-700 dark:text-purple-300">
              {phase === "loading-posts"
                ? `Loading posts... ${postCount} found so far`
                : "Loading author profiles..."}
            </span>
          </div>
        )}

        {/* Event list */}
        {events.length === 0 && isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-slate-500 animate-spin" />
              <span>Searching relays for posts...</span>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No posts found for this feed
            </p>
          </div>
        ) : (
          <div className="space-y-4" style={{ overflowAnchor: "none" }}>
            {events.map((event, i) => (
              <div
                key={event.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: "backwards" }}
              >
                <NoteCard event={event} profile={profiles.get(event.pubkey)} />
              </div>
            ))}
          </div>
        )}

        {/* Done indicator */}
        {phase === "done" && events.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">
            {events.length} {events.length === 1 ? "post" : "posts"} loaded
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        <p>
          Powered by{" "}
          <a href="https://nostr.com" className="text-purple-500 hover:underline">
            Nostr
          </a>{" "}
          • Feed Viewer
        </p>
      </footer>
    </div>
  );
}
