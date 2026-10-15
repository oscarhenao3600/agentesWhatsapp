const express = require('express');
const router = express.Router();
const { 
  getConversations, 
  sendManualMessage, 
  deleteConversation, 
  deleteMultipleConversations, 
  clearBranchConversations 
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/:branchId', protect, getConversations);
router.post('/:branchId/send', protect, sendManualMessage);
router.post('/delete-multiple', protect, deleteMultipleConversations);
router.delete('/branch/:branchId/clear', protect, clearBranchConversations);
router.delete('/:id', protect, deleteConversation);

module.exports = router;

