const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFeaturedContent,
  getNewestContent,
  getPopularContent,
  getMostReviewedContent,
  getHighestRatedContent,
  getContentByGenre,
  getContentById,
  getUserReviewedContent,
  refreshContent,
  createContent,
  getAllMovieContent,
  getAllTVContent,
  getBrowseContent
} = require('../controllers/contentController');

// Protected routes
router.use(protect);

// Browse route must be before /:id to avoid conflict
router.get('/browse', getBrowseContent);

// Content category routes
router.get('/featured', getFeaturedContent);
router.get('/newest', getNewestContent);
router.get('/popular', getPopularContent);
router.get('/most-reviewed', getMostReviewedContent);
router.get('/highest-rated', getHighestRatedContent);
router.get('/genre/:genreId', getContentByGenre);
router.get('/reviewed', getUserReviewedContent);
router.get('/movies', getAllMovieContent);
router.get('/tv', getAllTVContent);

// Admin routes
router.post('/refresh', refreshContent);
router.post('/', createContent);

// Get content by ID (must be last to not interfere with other routes)
router.get('/:id', getContentById);

module.exports = router;