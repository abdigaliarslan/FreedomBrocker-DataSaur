#!/bin/bash
set -e

echo "=== F.I.R.E. Challenge — Server Bootstrap ==="
echo ""

# ── 1. System packages ──
echo ">>> Installing system packages..."
apt-get update -y
apt-get install -y git curl docker.io docker-compose-plugin nginx ufw

# ── 2. Docker ──
echo ">>> Enabling Docker..."
systemctl enable docker
systemctl start docker

# ── 3. Firewall ──
echo ">>> Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 4. Project directory ──
echo ">>> Setting up project directory..."
mkdir -p /var/www/FreedomBrocker-DataSaur
cd /var/www/FreedomBrocker-DataSaur

# ── 5. Clone repo ──
if [ ! -d ".git" ]; then
  echo ">>> Cloning repository..."
  git clone https://github.com/abdigaliarslan/FreedomBrocker-DataSaur.git .
else
  echo ">>> Pulling latest code..."
  git fetch origin main
  git reset --hard origin/main
fi

# ── 6. Build and start ──
echo ">>> Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# ── 7. Check status ──
echo ""
echo ">>> Container status:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo "=== Setup complete! ==="
echo "Site available at: http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "  1. Build frontend locally: cd frontend && npm run build"
echo "  2. Copy dist to server: scp -r frontend/dist/ root@178.88.115.213:/var/www/FreedomBrocker-DataSaur/frontend/"
echo "  3. Or set up GitHub Actions secrets for auto-deploy"
