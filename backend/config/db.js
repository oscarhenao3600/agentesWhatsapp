const fs = require('fs');
const mongoose = require('mongoose');

const connectDB = async (retries = 10, delay = 3000) => {
  let mongoUri = process.env.MONGODB_URI || (
    process.env.NODE_ENV === 'production' 
      ? 'mongodb://mongodb:27017/agentes_whatsapp' 
      : 'mongodb://localhost:48160/agentes_whatsapp'
  );

  // Si corre dentro de un contenedor Docker y la URI apunta por error a localhost/127.0.0.1,
  // redirigir automáticamente al contenedor 'mongodb:27017' de la red interna de Docker
  const isDocker = fs.existsSync('/.dockerenv');
  if (isDocker && (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'))) {
    console.warn(`⚠️ MONGODB_URI apuntaba a ${mongoUri} dentro de Docker. Redirigiendo automáticamente a mongodb://mongodb:27017/agentes_whatsapp`);
    mongoUri = 'mongodb://mongodb:27017/agentes_whatsapp';
  } else if (!isDocker && mongoUri.includes('://mongodb:')) {
    console.warn(`⚠️ Ejecución fuera de Docker detectada con host 'mongodb'. Redirigiendo a mongodb://localhost:48160/agentes_whatsapp`);
    mongoUri = 'mongodb://localhost:48160/agentes_whatsapp';
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB conectado exitosamente: ${conn.connection.host}:${conn.connection.port}`);
      return conn;
    } catch (error) {
      if (!isDocker && mongoUri.includes(':48160')) {
        try {
          const fallbackUri = 'mongodb://127.0.0.1:27017/agentes_whatsapp';
          const conn = await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 3000,
          });
          console.log(`✅ MongoDB conectado exitosamente (instancia local 27017): ${conn.connection.host}:${conn.connection.port}`);
          return conn;
        } catch (_) {
          // Continuar con el flujo normal de reintentos
        }
      }

      console.warn(`⚠️ [Intento ${attempt}/${retries}] Esperando conexión a MongoDB (${error.message}). Reintentando en ${delay / 1000}s...`);

      if (attempt === retries) {
        console.error('❌ Error fatal: No se pudo conectar a MongoDB después de múltiples intentos.');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;

