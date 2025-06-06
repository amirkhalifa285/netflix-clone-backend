// controllers/adminController.js
const Log = require('../models/Log');
const Content = require('../models/Content');
const axios = require('axios');

// @desc    Get all logs with filtering options
// @route   GET /api/admin/logs
// @access  Private/Admin
exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const { action, email, startDate, endDate } = req.query;
    
    // Build query
    const query = {};
    
    // Apply filters if provided
    if (action) query.action = action;
    if (email && email.trim() !== '') {
      // Find user by email and then filter logs by user
      const User = require('../models/User');
      const user = await User.findOne({ email: { $regex: email, $options: 'i' } });
      if (user) {
        query.user = user._id;
      } else {
        // No user found with this email, return empty result
        return res.status(200).json({
          success: true,
          logs: [],
          total: 0,
          page,
          pages: 0
        });
      }
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }
    
    // Execute query with pagination
    const logs = await Log.find(query)
      .populate('user', 'email')
      .sort({ timestamp: -1 }) // Newest first
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Log.countDocuments(query);
    
    res.status(200).json({
      success: true,
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create a new log entry
// @route   POST /api/admin/logs
// @access  Private/Admin
exports.createLog = async (req, res) => {
  try {
    const { action, details } = req.body;
    
    // Validate required fields
    if (!action || !details) {
      return res.status(400).json({
        success: false,
        message: 'Please provide action and details for the log'
      });
    }
    
    // Create log with user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const log = await Log.create({
      user: req.user._id,
      action,
      details,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get trending content from TMDB that's not already in our DB
// @route   GET /api/admin/tmdb/trending/:type
// @access  Private/Admin
exports.getTrendingContent = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate content type
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Must be movie or tv.'
      });
    }
    

    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    
    const response1 = await axios.get(`https://api.themoviedb.org/3/trending/${type}/week?api_key=${TMDB_API_KEY}&page=1`);
    const response2 = await axios.get(`https://api.themoviedb.org/3/trending/${type}/week?api_key=${TMDB_API_KEY}&page=2`);
    
    const allResults = [...response1.data.results, ...response2.data.results];
    
    const existingContent = await Content.find({ type }, { tmdbId: 1, _id: 0 });
    const existingTmdbIds = existingContent.map(content => content.tmdbId);
    
    const newContent = allResults.filter(item => !existingTmdbIds.includes(item.id));
    
    const limitedContent = newContent.slice(0, 30);
    
    res.status(200).json({
      success: true,
      total: newContent.length,
      displayed: limitedContent.length,
      data: limitedContent,
      message: newContent.length === 0 ? 'All trending content is already in your database!' : null
    });
  } catch (error) {
    console.error('Error fetching trending content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Search TMDB for content not in our DB
// @route   GET /api/admin/tmdb/search
// @access  Private/Admin
exports.searchContent = async (req, res) => {
  try {
    const { query, type = 'movie' } = req.query;
    
    // Validate query and content type
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Must be movie or tv.'
      });
    }
    
    // Similar to trending, we'll search TMDB and get multiple pages if needed
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const response1 = await axios.get(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`);
    
    // If first page doesn't have enough results, get a second page
    let allResults = [...response1.data.results];
    if (response1.data.total_pages > 1 && response1.data.results.length < 20) {
      const response2 = await axios.get(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=2`);
      allResults = [...allResults, ...response2.data.results];
    }
    
    // Get all TMDB IDs for this content type that already exist in our database
    const existingContent = await Content.find({ type }, { tmdbId: 1, _id: 0 });
    const existingTmdbIds = existingContent.map(content => content.tmdbId);
    
    // Filter out content that already exists in our database
    const newContent = allResults.filter(item => !existingTmdbIds.includes(item.id));
    
    // Limit to 30 items if we have that many
    const limitedContent = newContent.slice(0, 30);
    
    res.status(200).json({
      success: true,
      total: newContent.length,
      displayed: limitedContent.length,
      data: limitedContent,
      message: newContent.length === 0 ? 'All matching content is already in your database!' : null
    });
  } catch (error) {
    console.error('Error searching TMDB:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Import content from TMDB to DB
// @route   POST /api/admin/tmdb/import
// @access  Private/Admin
exports.importContent = async (req, res) => {
  try {
    const { tmdbId, type = 'movie' } = req.body;
    
    // Validate inputs
    if (!tmdbId) {
      return res.status(400).json({
        success: false,
        message: 'TMDB ID is required'
      });
    }
    
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Must be movie or tv.'
      });
    }
    
    // Check if content already exists
    const existingContent = await Content.findOne({ tmdbId, type });
    if (existingContent) {
      return res.status(200).json({
        success: true,
        message: 'Content already exists in database',
        data: existingContent
      });
    }
    
    const { transformMovieData, transformTvData } = require('../services/tmdbService');
    
    let content;
    if (type === 'movie') {
      // Get movie details from TMDB API
      const TMDB_API_KEY = process.env.TMDB_API_KEY;
      const movieRes = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
      // Transform and save movie data
      const transformedData = await transformMovieData(movieRes.data);
      content = await Content.create(transformedData);
    } else {
      // Get TV show details from TMDB API
      const TMDB_API_KEY = process.env.TMDB_API_KEY;
      const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
      // Transform and save TV data
      const transformedData = await transformTvData(tvRes.data);
      content = await Content.create(transformedData);
    }
    
    // Create log entry for content addition
    await Log.create({
      user: req.user._id,
      action: 'add_content',
      details: `Added new ${type}: ${content.title}`,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: `${type === 'movie' ? 'Movie' : 'TV Show'} imported successfully`,
      data: content
    });
  } catch (error) {
    console.error('Error importing content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
};

// @desc    Get system statistics (counts)
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Stats endpoint - to be implemented'
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};