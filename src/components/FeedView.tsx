"use client";

import { useState, useEffect } from "react";
import { NostrEvent, Profile, FeedMetadata, TidalInfo } from "@/types";
import { fetchEvents, fetchProfiles, parseProfile } from "@/lib/nostr";
import { parseFeedEvent, compileFeed, describeFeed } from "@/lib/feed-parser";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naddr]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      // Decode naddr
      const decoded = decodeNaddr(naddr);
      if (!decoded) {
        throw new Error("Invalid naddr format");
      }

      // Fetch the feed definition event
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

      if (feedEvents.length === 0) {
        throw new Error("Feed not found");
      }

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

      if (!definition) {
        throw new Error("Invalid feed definition");
      }

      // Compile feed definition to filters
      const { filters, relays } = compileFeed(definition);

      // Fetch feed events
      const feedContentEvents = await fetchEvents(
        [...decoded.relays, ...relays],
        filters,
        20000
      );

      // Sort by created_at descending
      feedContentEvents.sort((a, b) => b.created_at - a.created_at);

      setEvents(feedContentEvents);

      // Fetch profiles for all authors
      const pubkeys = [...new Set(feedContentEvents.map((e) => e.pubkey))];
      const profileEvents = await fetchProfiles(pubkeys, decoded.relays);

      const profilesMap = new Map<string, Profile>();
      for (const [pk, event] of profileEvents) {
        profilesMap.set(pk, parseProfile(event));
      }
      setProfiles(profilesMap);
    } catch (err: any) {
      console.error("Failed to load feed:", err);
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadFeed} />;
  }

  if (!feed) {
    return <ErrorDisplay message="Feed not found" onRetry={loadFeed} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <FeedHeader feed={feed} eventCount={events.length} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No posts found for this feed
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {events.map((event) => (
              <div key={event.id} className="animate-fade-in">
                <NoteCard event={event} profile={profiles.get(event.pubkey)} />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        <p>
          Powered by{" "}
          <a
            href="https://nostr.com"
            className="text-purple-500 hover:underline"
          >
            Nostr
          </a>{" "}
          • Feed Viewer
        </p>
      </footer>
    </div>
  );
}
