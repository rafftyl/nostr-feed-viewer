"use client";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        {/* Animated rings */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-purple-200 dark:border-purple-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>

        <p className="text-slate-600 dark:text-slate-300 font-medium text-lg mb-1">
          {message || "Loading feed..."}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Connecting to Nostr relays
        </p>
      </div>
    </div>
  );
}
