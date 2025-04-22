// controllers/recommendationController.js
const recommendationService = require('../services/recommendationService');
const Profile = require('../models/Profile');

exports.getRecommendations = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { type, limit = 10 } = req.query;
    
    // Verify profile exists and belongs to the user
    const profile = await Profile.findOne({ 
      _id: profileId,
      owner: req.user._id
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or unauthorized'
      });
    }
    
    // Get recommendations
    const recommendations = await recommendationService.getRecommendationsForProfile(
      profileId, 
      parseInt(limit),
      type
    );
    
    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};