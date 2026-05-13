require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares de Seguridad
app.use(helmet()); // Cabeceras de seguridad
app.use(mongoSanitize()); // Prevenir inyección NoSQL
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parsear JSON

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/branch', require('./routes/branch'));
app.use('/api/order', require('./routes/order'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});
