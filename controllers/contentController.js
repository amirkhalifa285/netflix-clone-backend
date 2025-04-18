const Content = require('../models/Content');
const tmdbService = require('../services/tmdbService');
const Review = require('../models/Review'); 

// Helper function to get content with reviews aggregation
const getContentWithReviews = async (query = {}, limit = 10) => {
  return await Content.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'content',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        reviewCount: { $size: '$reviews' },
        averageRating: { 
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.rating' },
            0
          ]
        }
      }
    },
    { $limit: limit }
  ]);
};

// @desc    Fetch featured content (for banner rotation)
// @route   GET /api/content/featured
// @access  Private
exports.getFeaturedContent = async (req, res) => {
  try {
    const featuredContent = await Content.find({ featured: true })
      .select('title overview backdropPath posterPath type releaseDate voteAverage');
    
    if (featuredContent.length === 0) {
      // If no featured content, set some and try again
      await tmdbService.setFeaturedContent();
      const newFeaturedContent = await Content.find({ featured: true })
        .select('title overview backdropPath posterPath type releaseDate voteAverage');
      
      return res.status(200).json({
        success: true,
        count: newFeaturedContent.length,
        data: newFeaturedContent
      });
    }
    
    res.status(200).json({
      success: true,
      count: featuredContent.length,
      data: featuredContent
    });
  } catch (error) {
    console.error('Error fetching featured content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch newest content
// @route   GET /api/content/newest
// @access  Private
exports.getNewestContent = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    const query = type ? { type } : {};
    const newestContent = await Content.find(query)
      .sort({ releaseDate: -1 })
      .limit(parseInt(limit))
      .select('title posterPath backdropPath type releaseDate voteAverage');
    
    res.status(200).json({
      success: true,
      count: newestContent.length,
      data: newestContent
    });
  } catch (error) {
    console.error('Error fetching newest content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch most popular content
// @route   GET /api/content/popular
// @access  Private
exports.getPopularContent = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    const query = type ? { type } : {};
    const popularContent = await Content.find(query)
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .select('title posterPath backdropPath type releaseDate voteAverage popularity');
    
    res.status(200).json({
      success: true,
      count: popularContent.length,
      data: popularContent
    });
  } catch (error) {
    console.error('Error fetching popular content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch most reviewed content
// @route   GET /api/content/most-reviewed
// @access  Private
exports.getMostReviewedContent = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    const query = type ? { type } : {};
    const mostReviewedContent = await getContentWithReviews(query, parseInt(limit));
    
    // Sort by review count
    mostReviewedContent.sort((a, b) => b.reviewCount - a.reviewCount);
    
    res.status(200).json({
      success: true,
      count: mostReviewedContent.length,
      data: mostReviewedContent.map(item => ({
        _id: item._id,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        type: item.type,
        releaseDate: item.releaseDate,
        voteAverage: item.voteAverage,
        reviewCount: item.reviewCount
      }))
    });
  } catch (error) {
    console.error('Error fetching most reviewed content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch highest rated content
// @route   GET /api/content/highest-rated
// @access  Private
exports.getHighestRatedContent = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    const query = type ? { type } : {};
    const highestRatedContent = await getContentWithReviews(query, parseInt(limit));
    
    // Filter content with at least one review and sort by average rating
    const filteredContent = highestRatedContent
      .filter(item => item.reviewCount > 0)
      .sort((a, b) => b.averageRating - a.averageRating);
    
    res.status(200).json({
      success: true,
      count: filteredContent.length,
      data: filteredContent.map(item => ({
        _id: item._id,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        type: item.type,
        releaseDate: item.releaseDate,
        voteAverage: item.voteAverage,
        averageRating: item.averageRating,
        reviewCount: item.reviewCount
      }))
    });
  } catch (error) {
    console.error('Error fetching highest rated content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch content by genre
// @route   GET /api/content/genre/:genreId
// @access  Private
exports.getContentByGenre = async (req, res) => {
  try {
    const { genreId } = req.params;
    const { type, limit = 10 } = req.query;
    
    // Create query with genre matching
    const query = { 'genres.id': parseInt(genreId) };
    if (type) query.type = type;
    
    const contentByGenre = await Content.find(query)
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .select('title posterPath backdropPath type releaseDate voteAverage genres');
    
    res.status(200).json({
      success: true,
      count: contentByGenre.length,
      data: contentByGenre
    });
  } catch (error) {
    console.error('Error fetching content by genre:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get content detail by ID
// @route   GET /api/content/:id
// @access  Private
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await Content.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    // Get reviews for this content
    const reviews = await Review.find({ content: id, isPublic: true })
      .populate('user', 'email')
      .select('rating review isPublic createdAt user');
    
    res.status(200).json({
      success: true,
      data: {
        ...content.toObject(),
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching content detail:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch user's reviewed content
// @route   GET /api/content/reviewed
// @access  Private
exports.getUserReviewedContent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;
    
    // Find user's reviews and join with content
    const userReviews = await Review.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('content', 'title posterPath backdropPath type releaseDate voteAverage');
    
    res.status(200).json({
      success: true,
      count: userReviews.length,
      data: userReviews.map(review => ({
        _id: review.content._id,
        title: review.content.title,
        posterPath: review.content.posterPath,
        backdropPath: review.content.backdropPath,
        type: review.content.type,
        releaseDate: review.content.releaseDate,
        voteAverage: review.content.voteAverage,
        userRating: review.rating,
        reviewId: review._id
      }))
    });
  } catch (error) {
    console.error('Error fetching user reviewed content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Refresh content from TMDB API
// @route   POST /api/content/refresh
// @access  Private/Admin
exports.refreshContent = async (req, res) => {
  try {
    // This endpoint should only be accessible by admins
    const { type } = req.query; // 'trending', 'new', or 'genre'
    const { genreId } = req.body;
    
    let result;
    
    switch(type) {
      case 'trending':
        result = await tmdbService.fetchAndStoreTrending();
        break;
      case 'new':
        result = await tmdbService.fetchAndStoreNewReleases();
        break;
      case 'genre':
        if (!genreId) {
          return res.status(400).json({
            success: false,
            message: 'Genre ID is required for genre refresh'
          });
        }
        result = await tmdbService.fetchAndStoreByGenre(genreId, req.body.contentType || 'movie');
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid refresh type'
        });
    }
    
    res.status(200).json({
      success: true,
      message: 'Content refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error refreshing content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create new content (Admin only)
// @route   POST /api/content
// @access  Private/Admin
exports.createContent = async (req, res) => {
  try {
    const {
      tmdbId,
      title,
      type,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      genres,
      runtime,
      popularity,
      voteAverage,
      voteCount,
      cast,
      crew,
      seasons,
      keywords,
      featured
    } = req.body;
    
    // Check if content already exists
    const existingContent = await Content.findOne({ tmdbId, type });
    
    if (existingContent) {
      return res.status(400).json({
        success: false,
        message: 'Content already exists'
      });
    }
    
    // Create new content
    const content = await Content.create({
      tmdbId,
      title,
      type,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      genres,
      runtime,
      popularity,
      voteAverage,
      voteCount,
      cast,
      crew,
      seasons,
      keywords,
      featured,
      addedAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};