#!/bin/bash
set -e

echo "============================================"
echo "  WSP Manager - Instalacion Automatica"
echo "  Clemencia Brand"
echo "============================================"
echo ""

# Detectar OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  OS="unknown"
fi

echo "[1/7] Instalando dependencias del sistema..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  sudo apt update -qq
  sudo apt install -y curl git nginx certbot python3-certbot-nginx
elif [ "$OS" = "amzn" ]; then
  sudo yum install -y curl git nginx
else
  echo "OS no detectado. Instala manualmente: curl, git, nginx, Node.js 20"
fi

echo "[2/7] Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
  sudo apt install -y nodejs 2>/dev/null || sudo yum install -y nodejs 2>/dev/null || true
fi
echo "Node.js: $(node -v)"

echo "[3/7] Instalando PM2..."
sudo npm install -g pm2 2>/dev/null || npm install -g pm2

echo "[4/7] Instalando Evolution API..."
EVOLUTION_DIR="$HOME/evolution-api"
if [ ! -d "$EVOLUTION_DIR" ]; then
  git clone https://github.com/EvolutionAPI/evolution-api.git "$EVOLUTION_DIR"
  cd "$EVOLUTION_DIR"
  npm install
  cp src/dev-env.yml src/env.yml
  # Configurar Evolution
  sed -i 's/AUTHENTICATION_API_KEY:.*/AUTHENTICATION_API_KEY: clemencia-evo-key/' src/env.yml 2>/dev/null || true
else
  echo "Evolution API ya instalada"
fi

echo "[5/7] Instalando WSP Manager backend..."
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR/backend"
npm install

# Crear .env si no existe
if [ ! -f .env ]; then
  cp .env.example .env
  # Generar JWT secret aleatorio
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "clemencia-$(date +%s)-secret")
  sed -i "s/cambia-este-secreto-a-algo-seguro-y-largo/$JWT_SECRET/" .env
  echo "[Config] .env creado. Edita con: nano $INSTALL_DIR/backend/.env"
fi

# Crear directorios
mkdir -p data uploads

echo "[6/7] Configurando PM2..."
cd "$INSTALL_DIR"

# Evolution API
pm2 start "$EVOLUTION_DIR/src/index.js" --name evolution-api 2>/dev/null || echo "Evolution API ya registrada en PM2"

# WSP Manager
pm2 start backend/server.js --name wsp-manager 2>/dev/null || pm2 restart wsp-manager

pm2 save
pm2 startup 2>/dev/null || true

echo "[7/7] Configurando backup automatico..."
chmod +x scripts/backup.sh
# Agregar cron de backup diario a las 2am
(crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/scripts/backup.sh >> $INSTALL_DIR/backups/backup.log 2>&1") | sort -u | crontab -

echo ""
echo "============================================"
echo "  Instalacion completada!"
echo "============================================"
echo ""
echo "Servicios:"
echo "  - Evolution API: http://localhost:8081"
echo "  - WSP Manager:   http://localhost:3002"
echo ""
echo "Login por defecto:"
echo "  Email:    admin@clemencia.com"
echo "  Password: admin123"
echo ""
echo "Siguiente paso:"
echo "  1. Editar backend/.env con tu dominio y API keys"
echo "  2. Configurar Nginx (ver nginx.example.conf)"
echo "  3. Obtener SSL: sudo certbot --nginx -d tu-dominio.com"
echo "  4. Abrir http://tu-ip:3002 y conectar WhatsApp"
echo ""
echo "Comandos utiles:"
echo "  pm2 status          - Ver servicios"
echo "  pm2 logs wsp-manager - Ver logs"
echo "  pm2 restart all     - Reiniciar todo"
echo ""
