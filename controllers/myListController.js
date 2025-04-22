const Profile = require('../models/Profile');
const Content = require('../models/Content');

// @desc    Get a profile's My List
// @route   GET /api/mylist/:profileId
// @access  Private
exports.getMyList = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Verify profile exists and belongs to user
    const profile = await Profile.findOne({
      _id: profileId,
      owner: req.user._id
    }).populate('myList');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    res.status(200).json({
      success: true,
      count: profile.myList.length,
      data: profile.myList
    });
  } catch (error) {
    console.error('Error fetching My List:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Add content to My List
// @route   POST /api/mylist/:profileId
// @access  Private
exports.addToMyList = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { contentId } = req.body;
    
    if (!contentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide content ID'
      });
    }
    
    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
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
    
    // Check if content is already in My List
    if (profile.myList.includes(contentId)) {
      return res.status(400).json({
        success: false,
        message: 'Content already in My List'
      });
    }
    
    // Add content to My List
    profile.myList.push(contentId);
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Content added to My List',
      data: profile
    });
  } catch (error) {
    console.error('Error adding to My List:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Remove content from My List
// @route   DELETE /api/mylist/:profileId/:contentId
// @access  Private
exports.removeFromMyList = async (req, res) => {
  try {
    const { profileId, contentId } = req.params;
    
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
    
    // Check if content is in My List
    if (!profile.myList.includes(contentId)) {
      return res.status(400).json({
        success: false,
        message: 'Content not in My List'
      });
    }
    
    // Remove content from My List
    profile.myList = profile.myList.filter(
      id => id.toString() !== contentId
    );
    
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Content removed from My List',
      data: profile
    });
  } catch (error) {
    console.error('Error removing from My List:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};