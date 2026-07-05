"use client";

import { useState, useMemo } from "react";
import { NostrEvent, Profile, TidalInfo } from "@/types";
import { formatDistanceToNow } from "date-fns";
import TidalWidget from "./TidalWidget";

interface NoteCardProps {
  event: NostrEvent;
  profile?: Profile;
}

export default function NoteCard({ event, profile }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const parsedContent = useMemo(() => parseContent(event.content), [event.content]);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const displayName =
    profile?.display_name || profile?.name || npubShort(event.pubkey);

  const avatarUrl = profile?.picture;

  return (
    <article className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4">
        {/* Author header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
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
              <span className="font-mono text-xs">{npubShort(event.pubkey)}</span>
              <span>•</span>
              <time dateTime={new Date(event.created_at * 1000).toISOString()}>
                {timeAgo}
              </time>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {parsedContent.map((item, i) => {
            if (item.type === "text") {
              return <p key={i} className="whitespace-pre-wrap break-words">{item.content}</p>;
            }
            if (item.type === "link") {
              // Check for Tidal
              const tidal = detectTidal(item.content);
              if (tidal) {
                return <TidalWidget key={i} info={tidal} />;
              }
              // Check for images
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
              // Check for YouTube
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
              // Check for Spotify
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
              // Regular link
              return (
                <a
                  key={i}
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                >
                  {truncateUrl(item.content)}
                </a>
              );
            }
            if (item.type === "hashtag") {
              return (
                <span
                  key={i}
                  className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-sm font-medium"
                >
                  {item.content}
                </span>
              );
            }
            if (item.type === "nostr-ref") {
              return (
                <span
                  key={i}
                  className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-sm font-mono"
                >
                  {item.content}
                </span>
              );
            }
            return null;
          })}
        </div>

        {/* Event tags */}
        {event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {event.tags
              .filter((t) => t[0] === "t")
              .slice(0, 5)
              .map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                >
                  #{tag[1]}
                </span>
              ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-6 text-slate-500 dark:text-slate-400">
          <button className="flex items-center gap-1.5 text-sm hover:text-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Reply
          </button>
          <button className="flex items-center gap-1.5 text-sm hover:text-green-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Repost
          </button>
          <button className="flex items-center gap-1.5 text-sm hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Like
          </button>
          <a
            href={`https://njump.me/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm hover:text-purple-500 transition-colors ml-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View
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
  
  // Regex patterns
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const hashtagRegex = /(#\w+)/g;
  const nostrRefRegex = /(nostr:[a-z0-9]+)/gi;

  // Split content into tokens
  const tokens = content.split(/(\s+)/);
  let currentText = "";

  for (const token of tokens) {
    if (urlRegex.test(token)) {
      // Flush current text
      if (currentText.trim()) {
        parts.push({ type: "text", content: currentText });
        currentText = "";
      }
      parts.push({ type: "link", content: token });
      urlRegex.lastIndex = 0;
    } else if (hashtagRegex.test(token)) {
      if (currentText.trim()) {
        parts.push({ type: "text", content: currentText });
        currentText = "";
      }
      parts.push({ type: "hashtag", content: token });
      hashtagRegex.lastIndex = 0;
    } else if (nostrRefRegex.test(token)) {
      if (currentText.trim()) {
        parts.push({ type: "text", content: currentText });
        currentText = "";
      }
      parts.push({ type: "nostr-ref", content: token });
      nostrRefRegex.lastIndex = 0;
    } else {
      currentText += token;
    }
  }

  if (currentText.trim()) {
    parts.push({ type: "text", content: currentText });
  }

  return parts;
}

// ─── Media Detection ─────────────────────────────────────────────────────────

function detectTidal(url: string): TidalInfo | null {
  const regex = /(?:https?:\/\/)?(?:www\.)?tidal\.com\/browse\/(track|album|playlist)\/(\d+)/i;
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
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function detectSpotify(url: string): { type: string; id: string } | null {
  const regex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function npubShort(pubkey: string): string {
  return pubkey.slice(0, 8) + "..." + pubkey.slice(-6);
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "...";
}
