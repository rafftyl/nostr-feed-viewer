"use client";

import { useState, useEffect } from "react";
import { NostrEvent, Profile } from "@/types";
import { fetchEvents, fetchProfiles, parseProfile } from "@/lib/nostr";
import { decodeNostrNoteRef, npubShort } from "@/lib/naddr";
import { formatDistanceToNow } from "date-fns";

interface QuotedNoteProps {
  noteRef: string; // Full "nostr:note1..." or "nostr:nevent1..." string
}

export default function QuotedNote({ noteRef }: QuotedNoteProps) {
  const [event, setEvent] = useState<NostrEvent | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);

        const ref = decodeNostrNoteRef(noteRef);
        if (!ref) {
          if (!cancelled) setError(true);
          return;
        }

        // Fetch the quoted event
        const events = await fetchEvents(
          ref.relays,
          [{ ids: [ref.eventId], limit: 1 }],
          8000
        );

        if (cancelled) return;

        if (events.length === 0) {
          setError(true);
          return;
        }

        setEvent(events[0]);

        // Fetch the author profile
        const profileMap = await fetchProfiles(
          [events[0].pubkey],
          ref.relays
        );
        if (cancelled) return;

        const profileEvent = profileMap.get(events[0].pubkey);
        if (profileEvent) {
          setProfile(parseProfile(profileEvent));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [noteRef]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="my-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error || !event) {
    return (
      <div className="my-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-400 dark:text-slate-500 italic">
        Quoted note could not be loaded
      </div>
    );
  }

  // --- Rendered quote ---
  const displayName =
    profile?.display_name || profile?.name || npubShort(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  // Strip nostr: references from preview — they'd be confusing in a compact view
  const preview = event.content
    .replace(/nostr:[a-z0-9]+/gi, "[ref]")
    .slice(0, 300);

  return (
    <a
      href={`https://njump.me/${event.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60
                 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60
                 transition-colors cursor-pointer group"
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-1.5">
        {profile?.picture ? (
          <img
            src={profile.picture}
            alt=""
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[10px]">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
          {displayName}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
          {timeAgo}
        </span>
        {/* External link icon */}
        <svg
          className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors ml-auto flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>

      {/* Content preview */}
      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words line-clamp-4 leading-relaxed">
        {preview}
        {event.content.length > 300 && "..."}
      </p>
    </a>
  );
}
