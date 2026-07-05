"use client";

import { useParams } from "next/navigation";
import FeedView from "@/components/FeedView";

export default function NaddrPage() {
  const params = useParams();
  const naddr = (params?.naddr as string) || "";

  if (!naddr || !naddr.startsWith("naddr1")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            Invalid Feed URL
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            The URL must contain a valid <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">naddr1...</code> identifier.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return <FeedView naddr={naddr} />;
}
