#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR=${APP_DIR:-/opt/positiv}
DOMAIN=${1:-}

echo -e "${GREEN}🚀 Positiv VPS Setup Script${NC}"
echo "=============================="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Please run as root or with sudo${NC}"
   exit 1
fi

# Check for domain argument
if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Warning: No domain provided. Using localhost for development.${NC}"
    echo "Usage: $0 yourdomain.com"
    DOMAIN="localhost"
fi

echo -e "${GREEN}Step 1: System Update${NC}"
apt-get update && apt-get upgrade -y

echo -e "${GREEN}Step 2: Install Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

echo -e "${GREEN}Step 3: Install Docker Compose V2${NC}"
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
else
    echo "Docker Compose already installed"
fi

echo -e "${GREEN}Step 4: Install Git${NC}"
apt-get install -y git

echo -e "${GREEN}Step 5: Create app directory${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}Step 6: Clone repository (if not exists)${NC}"
if [ ! -d ".git" ]; then
    echo "Please provide your GitHub repository URL:"
    read -r REPO_URL
    git clone $REPO_URL .
else
    echo "Repository already exists, pulling latest changes"
    git pull origin main
fi

echo -e "${GREEN}Step 7: Setup environment file${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env
        echo -e "${YELLOW}Created .env from template.${NC}"
        echo -e "${YELLOW}IMPORTANT: Edit .env file with your actual configuration!${NC}"
        echo "Press enter to continue after editing .env file..."
        read
    else
        echo -e "${RED}No .env.docker.example found. Please create .env file manually.${NC}"
        exit 1
    fi
else
    echo ".env file already exists"
fi

echo -e "${GREEN}Step 8: Set domain in environment${NC}"
if [ "$DOMAIN" != "localhost" ]; then
    sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
    echo "Domain set to: $DOMAIN"
fi

echo -e "${GREEN}Step 9: Setup firewall (UFW)${NC}"
if ! command -v ufw &> /dev/null; then
    apt-get install -y ufw
fi
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}Step 10: Create systemd service${NC}"
cat > /etc/systemd/system/positiv.service <<EOF
[Unit]
Description=Positiv Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build app

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable positiv.service

echo -e "${GREEN}Step 11: Setup log rotation${NC}"
cat > /etc/logrotate.d/positiv <<EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

echo -e "${GREEN}Step 12: Create deployment user (optional)${NC}"
echo "Do you want to create a deployment user for GitHub Actions? (y/n)"
read -r CREATE_USER
if [ "$CREATE_USER" = "y" ]; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    echo "Please add the following SSH key to GitHub Secrets as VPS_SSH_KEY:"
    ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_deploy -N ""
    cat /home/deploy/.ssh/id_deploy
    echo ""
    echo "And add this public key to authorized_keys:"
    cat /home/deploy/.ssh/id_deploy.pub >> /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
fi

echo -e "${GREEN}Step 13: Initial deployment${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Edit .env file if you haven't already"
echo "2. Point your domain DNS to this server's IP"
echo "3. Add GitHub Secrets for automated deployment:"
echo "   - VPS_HOST: Your server IP or domain"
echo "   - VPS_USER: deploy (or root)"
echo "   - VPS_SSH_KEY: The private key shown above"
echo "   - VPS_APP_PATH: $APP_DIR"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # View logs"
echo "  docker compose ps               # Check status"
echo "  systemctl restart positiv       # Restart app"
echo "  docker compose exec app sh      # Shell into app container"
echo ""
if [ "$DOMAIN" != "localhost" ]; then
    echo "Your app will be available at: https://$DOMAIN"
    echo "Caddy will automatically provision SSL certificates."
else
    echo "Your app is available at: http://localhost"
fi