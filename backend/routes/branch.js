const express = require('express');
const router = express.Router();
const { 
  createBranch, 
  getBusinessBranches, 
  getBranchDetails, 
  updateBranchAI 
} = require('../controllers/branchController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createBranch);
router.get('/business/:businessId', protect, getBusinessBranches);
router.get('/:id', protect, getBranchDetails);
router.put('/:id/ai-config', protect, updateBranchAI);

module.exports = router;
