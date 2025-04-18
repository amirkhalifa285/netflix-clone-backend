const recommendationService = require('../services/recommendationService');
const Profile = require('../models/Profile');

// @desc    Get recommendations for a profile
// @route   GET /api/recommendations/:profileId
// @access  Private
exports.getRecommendations = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { limit = 10 } = req.query;
    
    // Verify profile exists and belongs to user
    const profile = await Profile.findOne({
      _id: profileId,
      owner: req.user._id
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    // Get recommendations
    const recommendations = await recommendationService.getRecommendationsForProfile(
      profileId,
      parseInt(limit)
    );
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};