const mongoose = require('mongoose');

const connectDB = async (retries = 10, delay = 3000) => {
  const mongoUri = process.env.MONGODB_URI || (
    process.env.NODE_ENV === 'production' 
      ? 'mongodb://mongodb:27017/agentes_whatsapp' 
      : 'mongodb://localhost:48160/agentes_whatsapp'
  );

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB conectado exitosamente: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ [Intento ${attempt}/${retries}] Esperando conexión a MongoDB (${error.message}). Reintentando en ${delay / 1000}s...`);

      if (mongoUri.includes('://mongodb:') && (error.message.includes('ENOTFOUND') || error.code === 'ENOTFOUND')) {
        console.warn(`💡 TIP: Si estás ejecutando 'npm run dev' en Windows fuera de Docker, cambia MONGODB_URI en tu archivo .env a: mongodb://localhost:48160/agentes_whatsapp`);
      }

      if (attempt === retries) {
        console.error('❌ Error fatal: No se pudo conectar a MongoDB después de múltiples intentos.');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;

