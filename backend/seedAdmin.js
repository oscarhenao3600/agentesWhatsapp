const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');

const ensureAdminUser = async ({ resetPassword = false } = {}) => {
  const adminUsername = (process.env.ADMIN_USERNAME || 'oscarhenao').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'oscar3600').trim();

  const existingAdmin = await User.findOne({ username: adminUsername });

  if (existingAdmin) {
    let updated = false;
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      updated = true;
    }
    if (!existingAdmin.active) {
      existingAdmin.active = true;
      updated = true;
    }
    // Sincronizar contraseña con ADMIN_PASSWORD de .env si difiere de la almacenada
    const matches = await existingAdmin.matchPassword(adminPassword);
    if (!matches || resetPassword) {
      existingAdmin.password = adminPassword;
      updated = true;
      console.log(`🔐 Sincronizando contraseña del administrador '${adminUsername}' con la configurada en .env`);
    }
    if (updated) {
      await existingAdmin.save();
      console.log(`✅ Usuario administrador '${adminUsername}' actualizado y sincronizado.`);
    } else {
      console.log(`ℹ️ El usuario administrador '${adminUsername}' ya existe y sus credenciales están sincronizadas.`);
    }
    return existingAdmin;
  }

  const created = await User.create({
    username: adminUsername,
    password: adminPassword,
    role: 'admin',
    active: true
  });
  console.log(`✅ Usuario administrador '${adminUsername}' creado exitosamente.`);
  return created;
};

if (require.main === module) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  require('dotenv').config({ override: true });
  const connectDB = require('./config/db');

  connectDB()
    .then(async () => {
      await ensureAdminUser({ resetPassword: true });
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error al crear/verificar el admin:', error);
      process.exit(1);
    });
}

module.exports = { ensureAdminUser };
