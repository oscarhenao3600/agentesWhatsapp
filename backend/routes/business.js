const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const { protect, authorize } = require('../middleware/auth');

// @desc    Obtener todos los negocios (Solo Admin)
// @route   GET /api/business
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const businesses = await Business.find().populate('owner', 'username');
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Obtener negocio propio (Cliente)
// @route   GET /api/business/me
// @access  Private/Client
router.get('/me', protect, authorize('client'), async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.status(404).json({ message: 'No se encontró configuración de negocio' });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Crear o actualizar configuración de negocio
// @route   POST /api/business
// @access  Private (Admin o Client)
router.post('/', protect, async (req, res) => {
  const { name, description, commission, ownerId } = req.body;

  try {
    const targetOwner = (req.user.role === 'admin' && ownerId) ? ownerId : req.user._id;
    
    let business = await Business.findOne({ owner: targetOwner });

    if (business) {
      // Actualizar
      business.name = name || business.name;
      business.description = description || business.description;
      
      if (req.user.role === 'admin') {
        business.commission = commission !== undefined ? commission : business.commission;
      }
      
      const updatedBusiness = await business.save();
      return res.json(updatedBusiness);
    } else {
      // Crear
      const newBusiness = new Business({
        owner: targetOwner,
        name,
        description,
        commission: req.user.role === 'admin' ? (commission || 10) : 10
      });

      const savedBusiness = await newBusiness.save();
      return res.status(201).json(savedBusiness);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Actualizar configuración de negocio por ID
// @route   PUT /api/business/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { name, description, commission } = req.body;

  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado' });
    }

    // Verificar permisos: Admin o el dueño del negocio
    if (req.user.role !== 'admin' && business.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    business.name = name || business.name;
    business.description = description || business.description;
    
    if (req.user.role === 'admin' && commission !== undefined) {
      business.commission = commission;
    }

    const updatedBusiness = await business.save();
    res.json(updatedBusiness);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Actualizar comisión de un negocio (Solo Admin)
// @route   PATCH /api/business/:id/commission
// @access  Private/Admin
router.patch('/:id/commission', protect, authorize('admin'), async (req, res) => {
  const { commission } = req.body;

  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado' });
    }

    business.commission = commission;
    const updatedBusiness = await business.save();
    res.json(updatedBusiness);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
