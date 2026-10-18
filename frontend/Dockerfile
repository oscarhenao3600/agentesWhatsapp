# Etapa de construcción (Build)
FROM node:20-alpine as build-stage

WORKDIR /app

COPY package*.json ./

# Limitar memoria de Node a 512MB para evitar OOM killer en Raspberry Pi 3B+ (1GB RAM)
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm install --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

COPY . .
RUN npm run build

# Etapa de producción con Nginx
FROM nginx:alpine as production-stage

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos de la etapa anterior
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Exponer el puerto 80 interno
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
