const Content = require('../models/Content');
const Review = require('../models/Review');
const natural = require('natural'); // You'll need to install this npm package
const { TfIdf } = natural;

const recommendationService = {
  // Generate content recommendations for a user profile
  getRecommendationsForProfile: async (profileId, limit = 10) => {
    try {
      // Get the profile's reviews
      const profileReviews = await Review.find({ profile: profileId })
        .populate('content');
      
      // If the profile has no reviews, return popular content
      if (profileReviews.length === 0) {
        return await Content.find()
          .sort({ popularity: -1 })
          .limit(limit);
      }
      
      // Extract genres and keywords from positively reviewed content (rating >= 3)
      const likedContent = profileReviews
        .filter(review => review.rating >= 3)
        .map(review => review.content);
      
      // If no positively reviewed content, return popular content
      if (likedContent.length === 0) {
        return await Content.find()
          .sort({ popularity: -1 })
          .limit(limit);
      }
      
      // Extract genres and keywords
      const likedGenres = new Map();
      const likedKeywords = new Map();
      
      likedContent.forEach(content => {
        // Count genres
        content.genres.forEach(genre => {
          const count = likedGenres.get(genre.id) || 0;
          likedGenres.set(genre.id, count + 1);
        });
        
        // Count keywords
        if (content.keywords) {
          content.keywords.forEach(keyword => {
            const count = likedKeywords.get(keyword.id) || 0;
            likedKeywords.set(keyword.id, count + 1);
          });
        }
      });
      
      // Sort genres and keywords by frequency
      const sortedGenres = [...likedGenres.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      const sortedKeywords = [...likedKeywords.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      // Get content IDs that the profile has already seen/reviewed
      const reviewedContentIds = profileReviews.map(review => 
        review.content._id.toString()
      );
      
      // Create TF-IDF for content similarity
      const tfidf = new TfIdf();
      
      // Add reviewed content documents to the corpus
      likedContent.forEach((content, index) => {
        // Create document text from title, overview, genres, and keywords
        let docText = `${content.title} ${content.overview}`;
        
        // Add genres
        content.genres.forEach(genre => {
          docText += ` ${genre.name}`;
        });
        
        // Add keywords if available
        if (content.keywords) {
          content.keywords.forEach(keyword => {
            docText += ` ${keyword.name}`;
          });
        }
        
        // Add to TF-IDF corpus
        tfidf.addDocument(docText);
      });
      
      // Get all content not already reviewed by the profile
      const allContent = await Content.find({
        _id: { $nin: reviewedContentIds }
      });
      
      // Calculate similarity scores for each content
      const scoredContent = allContent.map(content => {
        // Create document text for this content
        let docText = `${content.title} ${content.overview}`;
        
        // Add genres
        content.genres.forEach(genre => {
          docText += ` ${genre.name}`;
        });
        
        // Add keywords if available
        if (content.keywords) {
          content.keywords.forEach(keyword => {
            docText += ` ${keyword.name}`;
          });
        }
        
        // Calculate average similarity to liked content
        let totalSimilarity = 0;
        let maxSimilarity = 0;
        
        likedContent.forEach((likedItem, index) => {
          const similarity = tfidf.tfidfs(docText, index);
          totalSimilarity += similarity;
          maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        const avgSimilarity = likedContent.length > 0 
          ? totalSimilarity / likedContent.length 
          : 0;
        
        // Genre bonus: +0.2 for each matching genre in top 3
        let genreBonus = 0;
        content.genres.forEach(genre => {
          if (sortedGenres.slice(0, 3).includes(genre.id)) {
            genreBonus += 0.2;
          }
        });
        
        // Keyword bonus: +0.1 for each matching keyword in top 5
        let keywordBonus = 0;
        if (content.keywords) {
          content.keywords.forEach(keyword => {
            if (sortedKeywords.slice(0, 5).includes(keyword.id)) {
              keywordBonus += 0.1;
            }
          });
        }
        
        // Popularity factor (normalized between 0 and 0.5)
        const popularityFactor = content.popularity / 20; // Assuming max popularity around 1000
        
        // Final score
        const score = avgSimilarity + maxSimilarity + genreBonus + keywordBonus + popularityFactor;
        
        return {
          content,
          score
        };
      });
      
      // Sort by score and take top 'limit' results
      const recommendations = scoredContent
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.content);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }
};

module.exports = recommendationService;