const express = require('express');
const {
  getMyList,
  addToMyList,
  removeFromMyList
} = require('../controllers/myListController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get My List for a profile
router.get('/:profileId', getMyList);

// Add to My List
router.post('/:profileId', addToMyList);

// Remove from My List
router.delete('/:profileId/:contentId', removeFromMyList);

module.exports = router;