"use client";

import { useMemo } from "react";
import { NostrEvent, Profile, TidalInfo } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { npubShort } from "@/lib/naddr";
import TidalWidget from "./TidalWidget";
import QuotedNote from "./QuotedNote";

interface NoteCardProps {
  event: NostrEvent;
  profile?: Profile;
  isRepost?: boolean;
}

export default function NoteCard({ event, profile, isRepost }: NoteCardProps) {
  // ── NIP-18: Kind 6 reposts ─────────────────────────────────────────────────
  // The content of a kind 6 event is the JSON of the reposted event.
  // We render a repost header + the embedded event as a quoted note.
  if (event.kind === 6 && !isRepost) {
    let reposted: NostrEvent | null = null;
    try {
      reposted = JSON.parse(event.content);
    } catch {
      // content is not valid JSON — fall through to render as regular note
    }

    if (reposted && reposted.content) {
      const reposterName =
        profile?.display_name || profile?.name || npubShort(event.pubkey);

      return (
        <article className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700/60 overflow-hidden">
          <div className="p-4">
            {/* Repost indicator */}
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">{reposterName} reposted</span>
            </div>
            {/* Embedded original event */}
            <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
              <NoteCard event={reposted} profile={undefined} isRepost />
            </div>
          </div>
        </article>
      );
    }
  }

  // ── Regular note rendering ─────────────────────────────────────────────────

  const parsedContent = useMemo(
    () => parseContent(event.content),
    [event.content]
  );

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const displayName =
    profile?.display_name || profile?.name || npubShort(event.pubkey);

  const avatarUrl = profile?.picture;

  return (
    <article className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700/60 overflow-hidden">
      <div className="p-4">
        {/* Author header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {displayName}
              </span>
              {profile?.nip05 && (
                <span className="text-xs text-blue-500" title={profile.nip05}>
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-mono text-xs">
                {npubShort(event.pubkey)}
              </span>
              <span>•</span>
              <time
                dateTime={new Date(event.created_at * 1000).toISOString()}
              >
                {timeAgo}
              </time>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">
          {parsedContent.map((item, i) => {
            if (item.type === "text") {
              return (
                <p key={i} className="whitespace-pre-wrap break-words mb-1 last:mb-0">
                  {item.content}
                </p>
              );
            }
            if (item.type === "link") {
              const tidal = detectTidal(item.content);
              if (tidal) {
                return <TidalWidget key={i} info={tidal} />;
              }
              if (isImageUrl(item.content)) {
                return (
                  <div key={i} className="my-3">
                    <img
                      src={item.content}
                      alt="Embedded image"
                      className="rounded-lg max-h-96 object-cover w-full"
                      loading="lazy"
                    />
                  </div>
                );
              }
              const youtube = detectYouTube(item.content);
              if (youtube) {
                return (
                  <div key={i} className="my-3 aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtube}`}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                );
              }
              const spotify = detectSpotify(item.content);
              if (spotify) {
                return (
                  <div key={i} className="my-3">
                    <iframe
                      src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}?theme=0`}
                      width="100%"
                      height={spotify.type === "track" ? "80" : "152"}
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-lg"
                    />
                  </div>
                );
              }
              return (
                <a
                  key={i}
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 break-all transition-colors"
                >
                  {truncateUrl(item.content)}
                </a>
              );
            }
            if (item.type === "hashtag") {
              return (
                <span
                  key={i}
                  className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-sm font-medium mr-0.5"
                >
                  {item.content}
                </span>
              );
            }
            if (item.type === "nostr-ref") {
              // NIP-27: note1 / nevent1 refs render as inline quoted notes
              const clean = item.content.replace(/^nostr:/i, "");
              if (clean.startsWith("note1") || clean.startsWith("nevent1")) {
                return <QuotedNote key={i} noteRef={item.content} />;
              }
              // Other nostr refs (npub1, nprofile1, naddr1) — render as chips
              return (
                <span
                  key={i}
                  className="inline-block bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-sm font-mono mr-0.5"
                >
                  {item.content}
                </span>
              );
            }
            return null;
          })}
        </div>

        {/* Tags */}
        {event.tags.some((t) => t[0] === "t") && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.tags
              .filter((t) => t[0] === "t")
              .slice(0, 5)
              .map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
                >
                  #{tag[1]}
                </span>
              ))}
          </div>
        )}

        {/* View link */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
          <a
            href={`https://njump.me/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on njump
          </a>
        </div>
      </div>
    </article>
  );
}

// ─── Content Parsing ─────────────────────────────────────────────────────────

interface ContentPart {
  type: "text" | "link" | "hashtag" | "nostr-ref";
  content: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];

  // Single master regex — avoids lastIndex bugs from multiple .test() calls
  const masterRegex =
    /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)|(nostr:[a-z0-9]+)|(#[a-zA-Z0-9_]+)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = masterRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) parts.push({ type: "text", content: text });
    }

    if (match[1]) parts.push({ type: "link", content: match[1] });
    else if (match[2]) parts.push({ type: "nostr-ref", content: match[2] });
    else if (match[3]) parts.push({ type: "hashtag", content: match[3] });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: "text", content: text });
  }

  return parts;
}

// ─── Media Detection ─────────────────────────────────────────────────────────

function detectTidal(url: string): TidalInfo | null {
  const regex =
    /(?:https?:\/\/)?(?:(?:www|listen)\.)?tidal\.com\/(?:browse\/)?(track|album|playlist)\/(\d+)/i;
  const match = url.match(regex);
  if (match) {
    return {
      type: match[1] as "track" | "album" | "playlist",
      id: match[2],
      url,
    };
  }
  return null;
}

function detectYouTube(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function detectSpotify(
  url: string
): { type: string; id: string } | null {
  const regex =
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "...";
}
