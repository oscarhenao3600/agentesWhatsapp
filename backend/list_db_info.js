const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Business = require('./models/Business');
const Branch = require('./models/Branch');

async function main() {
  try {
    await connectDB();
    console.log('🟢 Conectado a MongoDB.\n');

    console.log('👥 USUARIOS REGISTRADOS:');
    const users = await User.find({});
    users.forEach(u => console.log(`- ID: ${u._id} | Usuario: ${u.username} | Rol: ${u.role}`));

    console.log('\n🏢 NEGOCIOS REGISTRADOS:');
    const businesses = await Business.find({}).populate('owner');
    businesses.forEach(b => console.log(`- ID: ${b._id} | Negocio: ${b.name} | Propietario: ${b.owner?.username || 'Sin dueño'} | Comisión: ${b.commission}%`));

    console.log('\n📂 SUCURSALES REGISTRADAS:');
    const branches = await Branch.find({}).populate('business');
    branches.forEach(br => console.log(`- ID: ${br._id} | Sucursal: ${br.name} | Negocio: ${br.business?.name || 'Sin negocio'} | WhatsApp ID: ${br.whatsappNumberId}`));

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
