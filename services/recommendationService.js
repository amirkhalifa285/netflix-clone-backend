// services/recommendationService.js
const Content = require('../models/Content');
const Review = require('../models/Review');
const Profile = require('../models/Profile');
const mongoose = require('mongoose');

/**
 * Simple recommendation service based on:
 * 1. Content rated 3+ stars
 * 2. Content added to My List
 */
const recommendationService = {
  /**
   * Get recommendations for a profile based on their reviews and My List
   * @param {string} profileId - The profile ID to get recommendations for
   * @param {number} limit - Maximum number of recommendations to return
   * @param {string} type - Optional content type filter ('movie' or 'tv')
   * @returns {Promise<Array>} Array of recommended content
   */
  getRecommendationsForProfile: async (profileId, limit = 10, type = null) => {
    try {
      console.log(`Generating recommendations for profile: ${profileId}, type: ${type}, limit: ${limit}`);
      
      // Find the profile with populated myList
      const profile = await Profile.findById(profileId).populate('myList');
      
      if (!profile) {
        console.log(`Profile not found: ${profileId}`);
        throw new Error('Profile not found');
      }
      
      // Get the profile's reviews with populated content
      const profileReviews = await Review.find({ profile: profileId }).populate('content');
      console.log(`Found ${profileReviews.length} reviews for profile`);
      
      // Collect content that the user has already interacted with (to exclude from recommendations)
      const interactedContentIds = new Set();
      
      // Track genre preferences
      const genreScores = {};
      
      // Process reviews to find genre preferences and already-seen content
      profileReviews.forEach(review => {
        if (review.content && review.content._id) {
          // Add to interacted content (to exclude from recommendations)
          interactedContentIds.add(review.content._id.toString());
          
          // Only consider content rated 3 stars or higher for preferences
          if (review.rating >= 3 && review.content.genres) {
            review.content.genres.forEach(genre => {
              if (genre && genre.id) {
                genreScores[genre.id] = (genreScores[genre.id] || 0) + 1;
              }
            });
          }
        }
      });
      
      // Process My List items
      if (profile.myList && profile.myList.length > 0) {
        // Function to safely get content object
        const getContentObject = (item) => {
          // If item is already populated
          if (typeof item === 'object' && item !== null && item._id) {
            return item;
          }
          // If item is just an ID string or ObjectId
          return null;
        };
        
        profile.myList.forEach(item => {
          // Add to interacted content list
          const contentId = typeof item === 'object' ? item._id : item;
          if (contentId) {
            interactedContentIds.add(contentId.toString());
          }
          
          // Get genres from My List item if it's a populated object
          const contentObj = getContentObject(item);
          if (contentObj && contentObj.genres) {
            contentObj.genres.forEach(genre => {
              if (genre && genre.id) {
                genreScores[genre.id] = (genreScores[genre.id] || 0) + 1;
              }
            });
          }
        });
      }
      
      console.log('Genre preferences:', genreScores);
      
      // If we have no preferences, return popular content
      if (Object.keys(genreScores).length === 0) {
        console.log('No genre preferences found, returning popular content');
        const query = type ? { type } : {};
        return await Content.find(query)
          .sort({ popularity: -1 })
          .limit(limit);
      }
      
      // Sort genres by preference score
      const sortedGenres = Object.entries(genreScores)
        .sort((a, b) => b[1] - a[1])
        .map(entry => parseInt(entry[0]));
        
      console.log('Top genres:', sortedGenres.slice(0, 3));
      
      // Build query for recommendations
      const query = {};
      
      // Add type filter if specified
      if (type) {
        query.type = type;
      }
      
      // Convert interaction IDs to ObjectIds
      const interactedIds = Array.from(interactedContentIds)
        .map(id => {
          try {
            return mongoose.Types.ObjectId(id);
          } catch (err) {
            return null;
          }
        })
        .filter(id => id !== null);
      
      // Exclude content the user has already interacted with
      if (interactedIds.length > 0) {
        query._id = { $nin: interactedIds };
      }
      
      // Get recommendations based on top 3 genres
      const favoriteGenres = sortedGenres.slice(0, 3);
      query['genres.id'] = { $in: favoriteGenres };
      
      console.log('Executing recommendation query:', JSON.stringify(query));
      
      // Get genre-based recommendations
      let recommendations = await Content.find(query)
        .sort({ popularity: -1 })
        .limit(limit);
      
      console.log(`Found ${recommendations.length} genre-based recommendations`);
      
      // If we don't have enough genre-based recommendations, add popular content
      if (recommendations.length < limit) {
        const remainingCount = limit - recommendations.length;
        console.log(`Need ${remainingCount} more recommendations, fetching popular content`);
        
        // Exclude already recommended content
        const recommendedIds = recommendations.map(item => item._id);
        const excludeIds = [...interactedIds, ...recommendedIds];
        
        const popularQuery = type ? { type } : {};
        if (excludeIds.length > 0) {
          popularQuery._id = { $nin: excludeIds };
        }
        
        const additionalRecommendations = await Content.find(popularQuery)
          .sort({ popularity: -1 })
          .limit(remainingCount);
          
        console.log(`Found ${additionalRecommendations.length} additional popular recommendations`);
        
        recommendations = [...recommendations, ...additionalRecommendations];
      }
      
      console.log(`Returning ${recommendations.length} total recommendations`);
      return recommendations;
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      
      // Fallback to popular content if any error occurs
      try {
        const query = type ? { type } : {};
        return await Content.find(query)
          .sort({ popularity: -1 })
          .limit(limit);
      } catch (fallbackError) {
        console.error('Error in fallback recommendation:', fallbackError);
        return []; // Last resort
      }
    }
  }
};

module.exports = recommendationService;