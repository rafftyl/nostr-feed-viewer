#!/bin/bash
set -e

echo "╔══════════════════════════════════════════╗"
echo "║   Nostr Feed Viewer — Deployment Script  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ─── 1. Install Docker if missing ────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed.${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# ─── 2. Install Nginx if missing ─────────────────────────────────────────────

if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Installing Nginx...${NC}"
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}Nginx installed.${NC}"
else
    echo -e "${GREEN}Nginx already installed.${NC}"
fi

# ─── 3. Install Certbot for SSL ──────────────────────────────────────────────

if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}Certbot installed.${NC}"
else
    echo -e "${GREEN}Certbot already installed.${NC}"
fi

# ─── 4. Copy Nginx config ───────────────────────────────────────────────────

echo -e "${YELLOW}Configuring Nginx...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx/nostrfeed.rafaltyl.com.conf"

if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" /etc/nginx/sites-available/nostrfeed.rafaltyl.com.conf
    ln -sf /etc/nginx/sites-available/nostrfeed.rafaltyl.com.conf /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}Nginx configured.${NC}"
else
    echo -e "${RED}Nginx config not found at $NGINX_CONF${NC}"
    exit 1
fi

# ─── 5. Build and start Docker container ─────────────────────────────────────

echo -e "${YELLOW}Building and starting the app...${NC}"
cd "$SCRIPT_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build
echo -e "${GREEN}App is running on port 3000.${NC}"

# ─── 6. Set up SSL with Certbot ──────────────────────────────────────────────

echo ""
echo -e "${YELLOW}Setting up SSL certificate...${NC}"
echo "You need a DNS A record for nostrfeed.rafaltyl.com pointing to this server's IP."
echo ""
read -p "Is the DNS record already set up? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d nostrfeed.rafaltyl.com --non-interactive --agree-tos --email admin@rafaltyl.com || true
    echo -e "${GREEN}SSL configured.${NC}"
    
    # Set up auto-renewal
    systemctl enable certbot.timer 2>/dev/null || true
    echo -e "${GREEN}Certbot auto-renewal enabled.${NC}"
else
    echo -e "${YELLOW}Skipping SSL setup. Run this when DNS is ready:${NC}"
    echo "  certbot --nginx -d nostrfeed.rafaltyl.com"
fi

# ─── 7. Done ─────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Deployment Complete!            ║"
echo "╠══════════════════════════════════════════╣"
echo "║  App: http://nostrfeed.rafaltyl.com      ║"
echo "║  Port: 3000 (proxied via Nginx)          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f       # View app logs"
echo "  docker compose restart       # Restart app"
echo "  docker compose down          # Stop app"
echo "  docker compose up -d --build # Rebuild & start"
echo ""
