const express = require('express');
const router = express.Router();
const { 
  getAllOrders,
  getBranchOrders, 
  updateOrderStatus, 
  getBusinessOrders 
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllOrders);
router.get('/branch/:branchId', protect, getBranchOrders);
router.get('/business/:businessId', protect, getBusinessOrders);
router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;
