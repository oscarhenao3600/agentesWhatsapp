# Usar una imagen de Node.js ligera basada en Alpine
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar Chromium, fuentes necesarias para Puppeteer (whatsapp-web.js) y tzdata para zona horaria
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata

# Configurar zona horaria de Colombia y ruta de Chromium para Puppeteer
ENV TZ=America/Bogota \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
