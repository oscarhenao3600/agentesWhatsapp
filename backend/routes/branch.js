const express = require('express');
const router = express.Router();
const { 
  createBranch, 
  getBusinessBranches, 
  getBranchDetails, 
  updateBranchAI,
  getAllBranches,
  deleteBranch,
  testCalendarConfig,
  getKnowledgeSources,
  uploadKnowledgeFile,
  addKnowledgeUrl,
  deleteKnowledgeSource
} = require('../controllers/branchController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createBranch);
router.get('/', protect, getAllBranches);
router.get('/business/:businessId', protect, getBusinessBranches);
router.get('/:id', protect, getBranchDetails);
router.put('/:id/ai-config', protect, updateBranchAI);
router.post('/:id/calendar/test', protect, testCalendarConfig);
router.get('/:id/sources', protect, getKnowledgeSources);
router.post('/:id/upload', protect, uploadKnowledgeFile);
router.post('/:id/url', protect, addKnowledgeUrl);
router.delete('/:id/sources/:sourceId', protect, deleteKnowledgeSource);
router.delete('/:id', protect, deleteBranch);

module.exports = router;
