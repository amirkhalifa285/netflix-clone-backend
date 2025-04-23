// routes/adminRoutes.js
const express = require('express');
const { 
  getLogs, 
  createLog, 
  getStats,
  getTrendingContent,
  searchContent,
  importContent
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes and authorize only admin
router.use(protect);
router.use(authorize('admin'));

// Log management routes
router.get('/logs', getLogs);
router.post('/logs', createLog);

// TMDB API routes
router.get('/tmdb/trending/:type', getTrendingContent);
router.get('/tmdb/search', searchContent);
router.post('/tmdb/import', importContent);

// Stats routes
router.get('/stats', getStats);

module.exports = router;