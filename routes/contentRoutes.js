// contentRoutes.js - updated file
const express = require('express');
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
  getBrowseContent, // New controller function
  searchContent     // New controller function
} = require('../controllers/contentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get featured content for banner
router.get('/featured', getFeaturedContent);

// Get newest content
router.get('/newest', getNewestContent);

// Get most popular content
router.get('/popular', getPopularContent);

// Get most reviewed content
router.get('/most-reviewed', getMostReviewedContent);

// Get highest rated content
router.get('/highest-rated', getHighestRatedContent);

// Get content by genre
router.get('/genre/:genreId', getContentByGenre);

// Get user's reviewed content
router.get('/reviewed', getUserReviewedContent);

// Get all movies and TV shows
router.get('/movies', getAllMovieContent);
router.get('/tv', getAllTVContent);

// New routes for browse/search page
router.get('/browse', getBrowseContent);
router.get('/search', searchContent);

// Get content details by ID
router.get('/:id', getContentById);

// Admin only routes
router.post('/refresh', authorize('admin'), refreshContent);
router.post('/', authorize('admin'), createContent);

module.exports = router;