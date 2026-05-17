const express = require('express');
const router = express.Router();
const { getConversations, sendManualMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/:branchId', protect, getConversations);
router.post('/:branchId/send', protect, sendManualMessage);

module.exports = router;
