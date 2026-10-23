# Usar una imagen de Node.js ligera basada en Alpine
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Actualizar paquetes de Alpine e instalar certificados y zona horaria
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
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

# Instalar dependencias de producción y limpiar caché de npm en la misma capa (ahorra ~300MB en disco)
RUN npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa el backend
EXPOSE 4050

# Iniciar el servidor directamente con node para manejo limpio de señales
CMD ["node", "server.js"]
