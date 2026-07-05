"use client";

import { TidalInfo } from "@/types";

interface TidalWidgetProps {
  info: TidalInfo;
}

export default function TidalWidget({ info }: TidalWidgetProps) {
  const typeLabel =
    info.type === "track"
      ? "Track"
      : info.type === "album"
        ? "Album"
        : "Playlist";

  const embedHeight = info.type === "track" ? 80 : 300;

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-black/30">
        <TidalLogo />
        <span className="text-white/90 text-sm font-medium">TIDAL</span>
        <span className="text-white/50 text-xs">•</span>
        <span className="text-white/50 text-xs">{typeLabel}</span>
      </div>

      {/* Embed */}
      <iframe
        src={`https://embed.tidal.com/${info.type}s/${info.id}`}
        width="100%"
        height={embedHeight}
        style={{ border: 0 }}
        allow="encrypted-media"
        loading="lazy"
        title={`TIDAL ${typeLabel}`}
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />

      {/* Footer link */}
      <div className="px-4 py-2 bg-black/20 flex items-center justify-between">
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors flex items-center gap-1"
        >
          Open in TIDAL
          <svg
            className="w-3 h-3"
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
        </a>
      </div>
    </div>
  );
}

function TidalLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004-4.004-4.004zM4.004 3.992L0 7.996l4.004 4.004L8.008 7.996 4.004 3.992zM12.012 12.004L8.008 16.008l4.004 4.004 4.004-4.004-4.004-4.004zM20.02 3.992l-4.004 4.004L20.02 12l4.004-4.004-4.004-4.004z"
        fill="#00FFFF"
      />
    </svg>
  );
}
