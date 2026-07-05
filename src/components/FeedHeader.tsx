"use client";

import { FeedMetadata } from "@/types";
import { npubShort } from "@/lib/naddr";

interface FeedHeaderProps {
  feed: FeedMetadata;
  eventCount: number;
}

export default function FeedHeader({ feed, eventCount }: FeedHeaderProps) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/60">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          {/* Feed icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md shadow-purple-500/20">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {feed.title || "Untitled Feed"}
            </h1>
            {feed.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {feed.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {eventCount} {eventCount === 1 ? "post" : "posts"}
              </span>
              <span>•</span>
              <span className="font-mono">{npubShort(feed.author)}</span>
            </div>
          </div>

          {/* Back button */}
          <a
            href="/"
            className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
