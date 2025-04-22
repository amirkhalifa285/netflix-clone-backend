const express = require('express');
const {
  createReview,
  getUserReviews,
  getContentReviews,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get user reviews and create new review
router.route('/')
  .get(getUserReviews)
  .post(createReview);

// Get reviews for a content
router.get('/content/:contentId', getContentReviews);

// Update and delete review
router.route('/:id')
  .put(updateReview)
  .delete(deleteReview);

module.exports = router;