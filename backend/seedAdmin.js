require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Verificar si ya existe
    const adminExists = await User.findOne({ username: 'oscarhenao' });
    
    if (adminExists) {
      console.log('El usuario administrador oscarhenao ya existe.');
    } else {
      await User.create({
        username: 'oscarhenao',
        password: 'oscar3600',
        role: 'admin'
      });
      console.log('Usuario administrador oscarhenao creado exitosamente.');
    }
    
    process.exit();
  } catch (error) {
    console.error('Error al crear el admin:', error);
    process.exit(1);
  }
};

seedAdmin();
