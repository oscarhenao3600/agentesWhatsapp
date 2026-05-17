const express = require('express');
const router = express.Router();
const { 
  getCommissionsReport,
  markCommissionsAsPaid
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Ambas rutas protegidas, pero markCommissionsAsPaid verifica admin internamente (o podríamos usar el middleware admin)
// Aquí getCommissionsReport usa 'protect' porque los clientes también pueden verlo (con vista limitada)
router.get('/commissions', protect, getCommissionsReport);

// Solo admin puede marcar como pagado
router.put('/commissions/mark-paid', protect, authorize('admin'), markCommissionsAsPaid);

module.exports = router;
