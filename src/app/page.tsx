"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isNaddr, decodeNaddr } from "@/lib/naddr";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let naddr = input.trim();

    // If user pastes a full URL, extract the naddr part
    const urlMatch = naddr.match(/(naddr1[a-zA-Z0-9]+)/);
    if (urlMatch) {
      naddr = urlMatch[1];
    }

    if (!isNaddr(naddr)) {
      setError("Please enter a valid naddr (starts with naddr1...)");
      return;
    }

    const decoded = decodeNaddr(naddr);
    if (!decoded) {
      setError("Could not decode naddr. Please check the format.");
      return;
    }

    router.push(`/${naddr}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo / Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
            <svg
              className="w-12 h-12 text-white"
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
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
          Nostr Feed Viewer
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center max-w-md mb-10">
          Browse custom Nostr feeds. Paste a Coracle feed{" "}
          <code className="text-sm bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
            naddr
          </code>{" "}
          to get started.
        </p>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder="Paste naddr1... or a full URL containing one"
              className="w-full px-5 py-4 text-base text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-28"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              View Feed
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </form>

        {/* Example feeds */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
            Try an example:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <ExampleButton
              label="Coracle News Feed"
              naddr="naddr1qvzqqqrujgpzqueyupdfgmrx57qcl5xq4j5qkc8mr62lmcer2lh35gy8xq7aqxz7qy88wumn8ghj7mn0wvhxcmmv9uq3wamnwvaz7tmjv4kxz7fwwpexjmtpdshxuet59uqpqdfcxsunwde4x5mrjde5xqcr2dq0g4lqv"
              onSelect={(n) => router.push(`/${n}`)}
            />
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="Simple URLs"
            description="Just paste a naddr after the domain. No complex query parameters."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            title="Coracle Feeds"
            description="Full support for Coracle's composable feed DSL — kinds, tags, authors, and more."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            }
            title="Music Widgets"
            description="Tidal, Spotify, and YouTube links render as beautiful embedded widgets."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
        <p>
          Powered by{" "}
          <a
            href="https://nostr.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:text-purple-600"
          >
            Nostr
          </a>{" "}
          • Open source •{" "}
          <a
            href="https://github.com/coracle-social/coracle"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:text-purple-600"
          >
            Coracle Feed Format
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 text-center">
      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ExampleButton({
  label,
  naddr,
  onSelect,
}: {
  label: string;
  naddr: string;
  onSelect: (n: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(naddr)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
    >
      <svg
        className="w-3.5 h-3.5 text-purple-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      {label}
    </button>
  );
}
