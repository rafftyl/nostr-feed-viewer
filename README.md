# Nostr Feed Viewer

Browse custom [Nostr](https://nostr.com) feeds with beautiful thread rendering, Tidal music widgets, and more.

## What It Does

This app lets you view **Coracle-style custom feeds** (kind `31890`) via simple URLs:

```
https://yourdomain.com/naddr1qvzqqq...
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

### Automated Script (Recommended)

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

   The script will ask you for:
   - **Domain name** (e.g. `nostrfeeds.rafaltyl.com`)
   - **Email** for Let's Encrypt certificate

   It will then:
   - Install Docker, Nginx, and Certbot (if missing)
   - Generate Nginx config for your domain
   - Build and start the Docker container
   - Set up HTTPS with Let's Encrypt (if DNS is ready)

3. **Visit** `https://yourdomain.com`

Config is saved to `.deploy-config` so future runs skip the prompts.

### Manual Docker Setup

```bash
docker compose up -d --build
```

Then configure Nginx and SSL manually.

---

## How a Feed Loads

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

## Managing the App

```bash
docker compose logs -f       # View app logs
docker compose restart       # Restart app
docker compose down          # Stop app
docker compose up -d --build # Rebuild & start
```

---

## License

MIT
