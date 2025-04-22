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

// Export all functions
module.exports = {
  getFeaturedContent: async (req, res) => {
    try {
      const featuredContent = await Content.find({ featured: true })
        .select('title overview backdropPath posterPath type releaseDate voteAverage genres original_language');
      
      if (featuredContent.length === 0) {
        await tmdbService.setFeaturedContent();
        const newFeaturedContent = await Content.find({ featured: true })
          .select('title overview backdropPath posterPath type releaseDate voteAverage genres original_language');
        
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
  },

  getNewestContent: async (req, res) => {
    try {
      const { type, limit = 10 } = req.query;
      
      const query = type ? { type } : {};
      const newestContent = await Content.find(query)
        .sort({ releaseDate: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview');
      
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
  },

  getPopularContent: async (req, res) => {
    try {
      const { type, limit = 10 } = req.query;
      
      const query = type ? { type } : {};
      const popularContent = await Content.find(query)
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage popularity genres original_language overview');
      
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
  },

  getMostReviewedContent: async (req, res) => {
    try {
      const { type, limit = 10 } = req.query;
      
      const query = type ? { type } : {};
      const mostReviewedContent = await getContentWithReviews(query, parseInt(limit));
      
      mostReviewedContent.sort((a, b) => b.reviewCount - a.reviewCount);
      
      res.status(200).json({
        success: true,
        count: mostReviewedContent.length,
        data: mostReviewedContent
      });
    } catch (error) {
      console.error('Error fetching most reviewed content:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  getHighestRatedContent: async (req, res) => {
    try {
      const { type, limit = 10 } = req.query;
      
      const query = type ? { type } : {};
      const ratedContent = await getContentWithReviews(query, parseInt(limit));
      
      const filteredContent = ratedContent
        .filter(item => item.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating);
      
      res.status(200).json({
        success: true,
        count: filteredContent.length,
        data: filteredContent
      });
    } catch (error) {
      console.error('Error fetching highest rated content:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  getContentByGenre: async (req, res) => {
    try {
      const { genreId } = req.params;
      const { limit = 10 } = req.query;
      
      const content = await Content.find({ 'genres.id': parseInt(genreId) })
        .limit(parseInt(limit))
        .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview');
      
      res.status(200).json({
        success: true,
        count: content.length,
        data: content
      });
    } catch (error) {
      console.error('Error fetching content by genre:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  getContentById: async (req, res) => {
    try {
      const content = await Content.findById(req.params.id)
        .select('title overview backdropPath posterPath type releaseDate voteAverage genres original_language');
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error fetching content by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  getUserReviewedContent: async (req, res) => {
    try {
      const reviews = await Review.find({ user: req.user.id })
        .populate({
          path: 'content',
          select: 'title posterPath backdropPath type releaseDate voteAverage genres original_language overview'
        });
      
      const reviewedContent = reviews.map(review => ({
        ...review.content.toObject(),
        userRating: review.rating,
        reviewDate: review.createdAt
      }));
      
      res.status(200).json({
        success: true,
        count: reviewedContent.length,
        data: reviewedContent
      });
    } catch (error) {
      console.error('Error fetching user reviewed content:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  refreshContent: async (req, res) => {
    try {
      await tmdbService.refreshContent();
      res.status(200).json({
        success: true,
        message: 'Content refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing content:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  },

  createContent: async (req, res) => {
    try {
      const content = await Content.create(req.body);
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
  },

  getAllMovieContent: async (req, res) => {
    try {
      const limit = req.query.limit || 50;

      const [featured, newest, popular, mostReviewed, highestRated] = await Promise.all([
        Content.find({ type: 'movie', featured: true })
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean(),
        Content.find({ type: 'movie' })
          .sort({ releaseDate: -1 })
          .limit(parseInt(limit))
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean(),
        Content.find({ type: 'movie' })
          .sort({ popularity: -1 })
          .limit(parseInt(limit))
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview popularity')
          .lean(),
        getContentWithReviews({ type: 'movie' }, parseInt(limit)),
        getContentWithReviews({ type: 'movie' }, parseInt(limit))
      ]);

      const filteredHighestRated = highestRated
        .filter(item => item.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating);
        
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
            genres: item.genres,
            original_language: item.original_language,
            overview: item.overview,
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
            genres: item.genres,
            original_language: item.original_language,
            overview: item.overview,
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
  },

  getAllTVContent: async (req, res) => {
    try {
      const limit = req.query.limit || 50;

      const [featured, newest, popular, mostReviewed, highestRated] = await Promise.all([
        Content.find({ type: 'tv', featured: true })
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean(),
        Content.find({ type: 'tv' })
          .sort({ releaseDate: -1 })
          .limit(parseInt(limit))
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean(),
        Content.find({ type: 'tv' })
          .sort({ popularity: -1 })
          .limit(parseInt(limit))
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview popularity')
          .lean(),
        getContentWithReviews({ type: 'tv' }, parseInt(limit)),
        getContentWithReviews({ type: 'tv' }, parseInt(limit))
      ]);

      const filteredHighestRated = highestRated
        .filter(item => item.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating);
        
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
            genres: item.genres,
            original_language: item.original_language,
            overview: item.overview,
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
            genres: item.genres,
            original_language: item.original_language,
            overview: item.overview,
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
  },

  getBrowseContent: async (req, res) => {
    try {
      const [movies, tvShows] = await Promise.all([
        Content.find({ type: 'movie' })
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean(),
        Content.find({ type: 'tv' })
          .select('title posterPath backdropPath type releaseDate voteAverage genres original_language overview')
          .lean()
      ]);

      const allContent = [...movies, ...tvShows];
      const uniqueGenres = new Set();

      allContent.forEach(item => {
        if (item.genres && Array.isArray(item.genres)) {
          item.genres.forEach(genre => {
            if (genre.name) {
              uniqueGenres.add(genre.name);
            }
          });
        }
      });

      res.status(200).json({
        success: true,
        data: {
          content: allContent,
          genres: Array.from(uniqueGenres).sort()
        }
      });
    } catch (error) {
      console.error('Error in getBrowseContent:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  }
};