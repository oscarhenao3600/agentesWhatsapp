require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');

// Conectar a la base de datos
connectDB();

const app = express();

app.get('/ping', (req, res) => res.send('pong'));

// Middlewares de Seguridad
app.use(helmet()); // Cabeceras de seguridad
app.use(mongoSanitize({ replaceWith: '_' })); // Prevenir inyección NoSQL
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parsear JSON

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/branch', require('./routes/branch'));
app.use('/api/order', require('./routes/order'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/chat', require('./routes/chat'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});
