#!/bin/bash
# ===================================================================
# SCRIPT DE DESPLIEGUE EN RASPBERRY PI 3 (DOCKER) - AGENTES WHATSAPP
# Diseñado para convivir con FormatosCuentas en el mismo servidor
# Soporta Raspberry Pi OS de 32 bits (armv7l) y 64 bits (aarch64)
# ===================================================================

set -e

echo "🚀 Iniciando despliegue de Agentes WhatsApp en Raspberry Pi..."

# 1. Verificar archivo .env
if [ ! -f .env ]; then
    echo "⚠️ Archivo .env no encontrado. Creando desde .env.example..."
    cp .env.example .env
    echo "ℹ️ Por favor edita .env con tus credenciales y configuración antes de continuar."
    exit 1
fi

# Corregir automáticamente si .env tiene la URI local de Windows (localhost/127.0.0.1:48160)
if grep -qE "^MONGODB_URI=mongodb://(localhost|127\.0\.0\.1)" .env; then
    echo "🔧 Ajustando MONGODB_URI en .env para red interna de Docker (mongodb://mongodb:27017/agentes_whatsapp)..."
    sed -i 's|^MONGODB_URI=mongodb://localhost:[0-9]*/|MONGODB_URI=mongodb://mongodb:27017/|g' .env
    sed -i 's|^MONGODB_URI=mongodb://127\.0\.0\.1:[0-9]*/|MONGODB_URI=mongodb://mongodb:27017/|g' .env
fi

# Cargar variables de entorno
set -a
source .env 2>/dev/null || true
set +a

# 2. Proteger la tarjeta microSD ajustando vm.swappiness=10 (evita Swap Thrashing en 1GB RAM)
if command -v sysctl &> /dev/null; then
    CURRENT_SWAPPINESS=$(cat /proc/sys/vm/swappiness 2>/dev/null || echo "60")
    if [ "$CURRENT_SWAPPINESS" -gt 10 ]; then
        echo "🛡️ Ajustando vm.swappiness=10 para proteger la tarjeta microSD del desgaste por Swap..."
        sudo sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
        if [ -f /etc/sysctl.conf ] && ! grep -q "^vm.swappiness" /etc/sysctl.conf; then
            echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf >/dev/null 2>&1 || true
        fi
    fi
fi

# Verificar memoria Swap
SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
if [ -n "$SWAP_TOTAL" ] && [ "$SWAP_TOTAL" -lt 1024 ]; then
    echo "⚠️ ADVERTENCIA: La memoria Swap actual es de solo ${SWAP_TOTAL}MB."
    echo "   Se recomienda tener 1024MB de Swap con vm.swappiness=10 como respaldo."
    echo "--------------------------------------------------------"
fi

# 3. Detectar arquitectura del procesador / sistema operativo
SYS_ARCH=$(uname -m)
echo "ℹ️ Arquitectura del sistema detectada: ${SYS_ARCH}"

# 4. Detectar comando de docker compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Docker Compose no está instalado. Instálalo con: sudo apt install docker-compose-plugin"
    exit 1
fi

# 5. Determinar servicios a levantar según arquitectura
SERVICES_TO_UP=""

if [[ "$SYS_ARCH" =~ ^armv7 ]] || [[ "$SYS_ARCH" =~ ^armhf ]]; then
    echo "⚠️ ATENCIÓN: Tu Raspberry Pi OS es de 32 bits (${SYS_ARCH})."
    echo "   MongoDB oficial no compila imágenes para 32 bits (linux/arm/v7)."
    
    # Verificar si el usuario ya configuró una URI externa o Atlas
    if [[ "$MONGODB_URI" =~ mongodb\+srv:\/\/ ]] || ([[ "$MONGODB_URI" =~ :27017 ]] && [[ ! "$MONGODB_URI" =~ mongodb:\/\/mongodb:27017 ]]); then
        echo "✅ MONGODB_URI configurada hacia base de datos externa/Atlas."
        echo "   Levantando servicios: backend y frontend (sin contenedor local de MongoDB)..."
        SERVICES_TO_UP="backend frontend"
    else
        echo ""
        echo "❌ No se puede levantar el contenedor local de MongoDB en un sistema de 32 bits."
        echo "👉 SOLUCIÓN RECOMENDADA (Gratis y ahorra ~350MB de RAM en la Pi):"
        echo "   1. Crea un cluster gratuito en MongoDB Atlas (https://www.mongodb.com/cloud/atlas)."
        echo "   2. Abre tu archivo .env y configura tu URI de Atlas:"
        echo "      MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/agentes_whatsapp?retryWrites=true&w=majority"
        echo "   3. Vuelve a ejecutar este script: ./deploy-pi.sh"
        echo ""
        read -p "¿Deseas forzar el levantamiento de solo Backend y Frontend ahora? (s/n): " RESP
        if [[ "$RESP" =~ ^[sSyY] ]]; then
            SERVICES_TO_UP="backend frontend"
        else
            exit 1
        fi
    fi
else
    # Sistema de 64 bits (aarch64 o x86_64)
    if [[ "$MONGODB_URI" =~ mongodb\+srv:\/\/ ]]; then
        echo "ℹ️ Usando MongoDB Atlas remoto. Levantando backend y frontend..."
        SERVICES_TO_UP="backend frontend"
    else
        SERVICES_TO_UP="" # Levanta todo el stack (mongodb, backend, frontend)
    fi
fi

# 6. Sincronizar últimos cambios desde git
if [ -d .git ] && command -v git &> /dev/null; then
    echo "🔄 Obteniendo últimos cambios desde el repositorio git..."
    git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || true
fi

# 7. Levantar contenedores asegurando compilación limpia del frontend
echo "📦 Compilando y levantando contenedores con $COMPOSE_CMD..."
$COMPOSE_CMD build --no-cache frontend
$COMPOSE_CMD up -d --build $SERVICES_TO_UP

# 8. Estado de los contenedores
echo ""
echo "✅ Despliegue finalizado con éxito."
$COMPOSE_CMD ps

IP_LOCAL=$(hostname -I 2>/dev/null | awk '{print $1}') || IP_LOCAL="localhost"
FRONT_PORT=${FRONTEND_PORT:-8090}
BACK_PORT=${BACKEND_PORT:-4050}

echo ""
echo "🌐 Aplicación disponible en:"
echo "   Panel Web Frontend: http://${IP_LOCAL}:${FRONT_PORT}"
echo "   API Backend:        http://${IP_LOCAL}:${BACK_PORT}/api"
echo "   Ping Healthcheck:   http://${IP_LOCAL}:${BACK_PORT}/ping"
echo "   Acceso Localhost:   http://localhost:${FRONT_PORT}"
