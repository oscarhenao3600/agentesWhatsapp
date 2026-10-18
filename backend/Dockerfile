# Usar una imagen de Node.js ligera basada en Alpine
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar solo certificados y zona horaria (sin Chromium para proteger RAM y microSD en Raspberry Pi)
RUN apk add --no-cache \
    ca-certificates \
    tzdata

# Configurar zona horaria de Colombia, motor Baileys exclusivo y límite de heap V8 para Raspberry Pi 1GB
ENV TZ=America/Bogota \
    DEFAULT_GATEWAY_TYPE=baileys \
    ALLOW_CHROMIUM=false \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_OPTIONS="--max-old-space-size=256"

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción limpiamente
RUN npm install --omit=dev --no-audit --no-fund

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa el backend
EXPOSE 4050

# Iniciar el servidor directamente con node para manejo limpio de señales
CMD ["node", "server.js"]
