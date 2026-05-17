const express = require('express');
const router = express.Router();
const { 
  createBranch, 
  getBusinessBranches, 
  getBranchDetails, 
  updateBranchAI,
  getAllBranches,
  deleteBranch
} = require('../controllers/branchController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createBranch);
router.get('/', protect, getAllBranches);
router.get('/business/:businessId', protect, getBusinessBranches);
router.get('/:id', protect, getBranchDetails);
router.put('/:id/ai-config', protect, updateBranchAI);
router.delete('/:id', protect, deleteBranch);

module.exports = router;
