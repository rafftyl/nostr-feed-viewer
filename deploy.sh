#!/bin/bash
set -e

echo "============================================================"
echo "       Nostr Feed Viewer - Deployment Script"
echo "============================================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- 0. Gather configuration ---

if [ -f "$SCRIPT_DIR/.deploy-config" ]; then
    source "$SCRIPT_DIR/.deploy-config"
    echo -e "${GREEN}Loaded saved config:${NC}"
    echo "  Domain: $DOMAIN"
    echo "  Email:  $EMAIL"
    echo ""
    read -p "Use this config? (Y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        rm "$SCRIPT_DIR/.deploy-config"
        DOMAIN=""
    fi
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Configuration:${NC}"
    read -p "  Domain name (e.g. nostrfeeds.rafaltyl.com): " DOMAIN
    read -p "  Email for Let's Encrypt (e.g. you@email.com): " EMAIL
    echo ""
    cat > "$SCRIPT_DIR/.deploy-config" <<EOF
DOMAIN="$DOMAIN"
EMAIL="$EMAIL"
EOF
    echo -e "${GREEN}Config saved to .deploy-config${NC}"
    echo ""
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain is required.${NC}"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    EMAIL="admin@${DOMAIN}"
fi

# --- 1. Install Docker if missing ---

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

# --- 2. Install Nginx if missing ---

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

# --- 3. Install Certbot for SSL ---

if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}Certbot installed.${NC}"
else
    echo -e "${GREEN}Certbot already installed.${NC}"
fi

# --- 4. Generate Nginx config ---

echo -e "${YELLOW}Configuring Nginx for ${DOMAIN}...${NC}"

cat > "/etc/nginx/sites-available/${DOMAIN}.conf" <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo -e "${GREEN}Nginx configured.${NC}"

# --- 5. Build and start Docker container ---

echo -e "${YELLOW}Building and starting the app...${NC}"
cd "$SCRIPT_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build
echo -e "${GREEN}App is running on port 3000.${NC}"

# --- 6. Set up SSL with Certbot ---

echo ""
echo -e "${YELLOW}Setting up SSL certificate for ${DOMAIN}...${NC}"
echo ""

if host "$DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}DNS resolves for ${DOMAIN}. Requesting certificate...${NC}"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
    echo -e "${GREEN}SSL configured.${NC}"
    systemctl enable certbot.timer 2>/dev/null || true
    echo -e "${GREEN}Certbot auto-renewal enabled.${NC}"
else
    echo -e "${RED}DNS does not resolve for ${DOMAIN} yet.${NC}"
    echo ""
    echo "Please add a DNS A record:"
    echo "  ${DOMAIN}  ->  $(curl -s ifconfig.me || echo '<your-server-ip>')"
    echo ""
    echo "Then run:"
    echo "  certbot --nginx -d ${DOMAIN} --agree-tos --email ${EMAIL}"
    echo ""
    read -p "Press Enter after DNS is ready to try again (or Ctrl+C to skip)..."
    if host "$DOMAIN" > /dev/null 2>&1; then
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
        echo -e "${GREEN}SSL configured.${NC}"
        systemctl enable certbot.timer 2>/dev/null || true
    else
        echo -e "${YELLOW}DNS still not resolving. SSL setup skipped. Run certbot manually when ready.${NC}"
    fi
fi

# --- 7. Done ---

echo ""
echo "============================================================"
echo "              Deployment Complete!"
echo "------------------------------------------------------------"
echo "  App:    https://${DOMAIN}"
echo "  Port:   3000 (proxied via Nginx + SSL)"
echo "============================================================"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f       # View app logs"
echo "  docker compose restart       # Restart app"
echo "  docker compose down          # Stop app"
echo "  docker compose up -d --build # Rebuild & start"
echo "  certbot renew                # Renew SSL certificate"
echo ""
