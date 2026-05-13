# Usar una imagen de Node.js ligera
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa el backend
EXPOSE 5000

# Comando para iniciar el servidor
CMD ["npm", "start"]
