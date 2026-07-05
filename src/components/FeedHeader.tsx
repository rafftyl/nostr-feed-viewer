"use client";

import { FeedMetadata } from "@/types";
import { describeFeed } from "@/lib/feed-parser";
import { npubFromHex } from "@/lib/naddr";

interface FeedHeaderProps {
  feed: FeedMetadata;
  eventCount: number;
}

export default function FeedHeader({ feed, eventCount }: FeedHeaderProps) {
  const feedDescription = feed.definition ? describeFeed(feed.definition) : "";

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {feed.title}
            </h1>
            {feed.description && (
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {feed.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {feedDescription}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {eventCount} {eventCount === 1 ? "post" : "posts"}
              </span>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-slate-500 dark:text-slate-400">
          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            by {npubFromHex(feed.author)}
          </span>
        </div>
      </div>
    </header>
  );
}
