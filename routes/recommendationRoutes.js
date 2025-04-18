const express = require('express');
const {
  getRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get recommendations for a profile
router.get('/:profileId', getRecommendations);

module.exports = router;