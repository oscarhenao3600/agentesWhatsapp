require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Business = require('./models/Business');
const Branch = require('./models/Branch');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agentes_whatsapp');
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
