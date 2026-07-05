# Nostr Feed Viewer

Browse custom [Nostr](https://nostr.com) feeds with beautiful thread rendering, Tidal music widgets, and more.

## What It Does

This app lets you view **Coracle-style custom feeds** (kind `31890`) via simple URLs:

```
https://nostrfeed.rafaltyl.com/naddr1qvzqqq...
```

### Features

- **Coracle Feed DSL** — Full support for the composable feed definition language (`kind 31890`): `kind`, `author`, `tag`, `intersection`, `union`, `scope`, `relay`, and more.
- **Beautiful Note Rendering** — Profile avatars, relative timestamps, hashtag chips, and nostr references.
- **Media Embeds** — YouTube, Spotify, and Tidal links render as inline widgets.
- **Tidal Widgets** — Tidal track/album/playlist links get a beautiful dark embed player with the TIDAL brand.
- **Image Previews** — Image URLs render inline.
- **Dark Mode** — Automatic dark/light mode via system preference.
- **Responsive** — Works great on mobile and desktop.

---

## Quick Start (Development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Prerequisites

- A VPS with Ubuntu/Debian (tested on Ubuntu 22.04)
- A domain name with an A record pointing to your VPS IP
- SSH access to the VPS

### Option 1: Automated Script (Recommended)

1. **Clone the repo on your VPS:**

   ```bash
   git clone <your-repo-url> /opt/nostr-feed-viewer
   cd /opt/nostr-feed-viewer
   ```

2. **Run the deploy script:**

   ```bash
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

   The script will:
   - Install Docker, Nginx, and Certbot (if missing)
   - Configure Nginx as a reverse proxy
   - Build and start the Docker container
   - Set up SSL with Let's Encrypt (if DNS is ready)

3. **Visit** `https://nostrfeed.rafaltyl.com`

### Option 2: Manual Docker Setup

1. **Build and run:**

   ```bash
   docker compose up -d --build
   ```

2. **Set up Nginx** — Copy the config:

   ```bash
   cp nginx/nostrfeed.rafaltyl.com.conf /etc/nginx/sites-available/
   ln -sf /etc/nginx/sites-available/nostrfeed.rafaltyl.com.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

3. **Set up SSL:**

   ```bash
   certbot --nginx -d nostrfeed.rafaltyl.com
   ```

### Option 3: Direct Node.js

1. **Build:**

   ```bash
   npm ci
   npm run build
   ```

2. **Run:**

   ```bash
   PORT=3000 node .next/standalone/server.js
   ```

3. **Use systemd** for process management (see `deploy/systemd.service`).

---

## Architecture

```
src/
├── app/
│   ├── [naddr]/page.tsx     # Dynamic route for naddr URLs
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page with paste input
│   └── globals.css           # Global styles + animations
├── components/
│   ├── FeedView.tsx          # Main orchestrator: loads feed, fetches events + profiles
│   ├── FeedHeader.tsx        # Feed title, description, metadata
│   ├── NoteCard.tsx          # Individual note rendering with media detection
│   ├── TidalWidget.tsx       # Tidal embed player widget
│   ├── LoadingSpinner.tsx    # Animated loading state
│   └── ErrorDisplay.tsx      # Error state with retry
├── lib/
│   ├── nostr.ts              # WebSocket relay pool, event fetching, profile fetching
│   ├── feed-parser.ts        # Coracle DSL parser → Nostr filters
│   └── naddr.ts              # Bech32 naddr encoding/decoding
└── types/
    └── index.ts              # TypeScript interfaces
```

### How a Feed Loads

1. User visits `/<naddr1...>`
2. The naddr is decoded → `{ kind: 31890, pubkey, identifier, relays }`
3. The feed definition event is fetched from relays (kind 31890, author, d-tag)
4. The `["feed", "..."]` tag is parsed → Coracle DSL tuple
5. The DSL is compiled into Nostr subscription filters
6. Content events matching the filters are fetched from relays
7. Author profiles (kind 0) are fetched
8. Everything renders

### Coracle Feed DSL

The feed definition is a recursive tuple stored as JSON in the event's `feed` tag:

```jsonc
// "Notes about #bitcoin from people I follow"
["intersection",
  ["scope", "follows"],
  ["kind", 1],
  ["tag", "#t", "bitcoin"]
]

// "Long-form articles OR notes from specific authors"
["union",
  ["kind", 30023],
  ["author", "pubkey1...", "pubkey2..."]
]
```

Supported types: `kind`, `author`, `tag`, `id`, `address`, `scope`, `relay`, `search`, `created_at`, `intersection`, `union`, `difference`, `global`, `list`, `wot`, `dvm`, `label`.

---

## Deployment Notes for 185.18.221.216

Make sure to:

1. **Point DNS**: Add an A record for `nostrfeed.rafaltyl.com` → `185.18.221.216`
2. **Open firewall**: Allow ports 80 and 443
3. **Run the deploy script**: `sudo ./deploy.sh`

### Managing the App

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Rebuild after code changes
git pull
docker compose up -d --build

# Stop
docker compose down
```

---

## License

MIT
