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

// @desc    Get all content for browse page with filtering options
// @route   GET /api/content/browse
// @access  Private
exports.getBrowseContent = async (req, res) => {
  try {
    // Extract all available content data for the browse page
    const limit = req.query.limit || 100;
    
    // Get all content with minimal fields for efficiency
    const allContent = await Content.find({})
      .select('title overview posterPath backdropPath type releaseDate voteAverage genres original_language popularity')
      .limit(parseInt(limit));
    
    // Extract unique genres from all content
    const genres = new Set(['All Genres']);
    allContent.forEach(content => {
      if (Array.isArray(content.genres)) {
        content.genres.forEach(genre => {
          if (typeof genre === 'string') {
            genres.add(genre);
          } else if (genre && genre.name) {
            genres.add(genre.name);
          }
        });
      }
    });
    
    // Extract unique languages
    const languages = new Set(['All Languages']);
    allContent.forEach(content => {
      if (content.original_language) {
        languages.add(content.original_language);
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        content: allContent,
        availableGenres: Array.from(genres),
        availableLanguages: Array.from(languages)
      }
    });
  } catch (error) {
    console.error('Error fetching browse content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Search content with filters
// @route   GET /api/content/search
// @access  Private
exports.searchContent = async (req, res) => {
  try {
    const {
      searchTerm,
      genre = 'All Genres',
      language = 'All Languages',
      sortBy = 'popularity',
      type,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build the query object with AND logic
    const query = {};
    
    // Add type filter if specified
    if (type && ['movie', 'tv'].includes(type)) {
      query.type = type;
    }
    
    // Add search term filter
    if (searchTerm && searchTerm.trim() !== '') {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { overview: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Add genre filter - FIXED to only use the correct path
    if (genre && genre !== 'All Genres') {
      // Only search in the name field of genres array objects
      query['genres.name'] = genre;
    }
    
    // Add language filter
    if (language && language !== 'All Languages') {
      query.original_language = language;
    }
    
    // Log the query for debugging
    console.log('Search query:', JSON.stringify(query, null, 2));
    
    // Determine sort order
    let sortOptions = {};
    switch(sortBy) {
      case 'Title':
        sortOptions = { title: 1 };
        break;
      case 'Year':
        sortOptions = { releaseDate: -1 };
        break;
      case 'Rating':
        sortOptions = { voteAverage: -1 };
        break;
      default:
        // Default to 'Suggestions For You' (popularity)
        sortOptions = { popularity: -1 };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute the query
    const content = await Content.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title overview posterPath backdropPath type releaseDate voteAverage genres');
    
    // Get total count for pagination
    const total = await Content.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: content.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: content
    });
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
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

// @desc    Fetch all movie content categories
// @route   GET /api/content/movies
// @access  Private
exports.getAllMovieContent = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    
    // Fetch all content categories but only for movies
    const [featured, newest, popular, mostReviewed, highestRated] = await Promise.all([
      Content.find({ type: 'movie', featured: true })
        .select('title overview backdropPath posterPath type releaseDate voteAverage')
        .limit(parseInt(limit)),
      Content.find({ type: 'movie' })
        .sort({ releaseDate: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage'),
      Content.find({ type: 'movie' })
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage popularity'),
      getContentWithReviews({ type: 'movie' }, parseInt(limit)),
      getContentWithReviews({ type: 'movie' }, parseInt(limit))
    ]);
    
    // Sort and filter highest rated content
    const filteredHighestRated = highestRated
      .filter(item => item.reviewCount > 0)
      .sort((a, b) => b.averageRating - a.averageRating);
      
    // Sort most reviewed content
    const sortedMostReviewed = mostReviewed.sort((a, b) => b.reviewCount - a.reviewCount);
    
    res.status(200).json({
      success: true,
      data: {
        featured,
        newest,
        popular,
        mostReviewed: sortedMostReviewed.map(item => ({
          _id: item._id,
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          type: item.type,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          reviewCount: item.reviewCount
        })),
        highestRated: filteredHighestRated.map(item => ({
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
      }
    });
  } catch (error) {
    console.error('Error fetching movie content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fetch all TV show content categories
// @route   GET /api/content/tv
// @access  Private
exports.getAllTVContent = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    
    // Fetch all content categories but only for TV shows
    const [featured, newest, popular, mostReviewed, highestRated] = await Promise.all([
      Content.find({ type: 'tv', featured: true })
        .select('title overview backdropPath posterPath type releaseDate voteAverage')
        .limit(parseInt(limit)),
      Content.find({ type: 'tv' })
        .sort({ releaseDate: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage'),
      Content.find({ type: 'tv' })
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage popularity'),
      getContentWithReviews({ type: 'tv' }, parseInt(limit)),
      getContentWithReviews({ type: 'tv' }, parseInt(limit))
    ]);
    
    // Sort and filter highest rated content
    const filteredHighestRated = highestRated
      .filter(item => item.reviewCount > 0)
      .sort((a, b) => b.averageRating - a.averageRating);
      
    // Sort most reviewed content
    const sortedMostReviewed = mostReviewed.sort((a, b) => b.reviewCount - a.reviewCount);
    
    res.status(200).json({
      success: true,
      data: {
        featured,
        newest,
        popular,
        mostReviewed: sortedMostReviewed.map(item => ({
          _id: item._id,
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          type: item.type,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          reviewCount: item.reviewCount
        })),
        highestRated: filteredHighestRated.map(item => ({
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
      }
    });
  } catch (error) {
    console.error('Error fetching TV content:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};