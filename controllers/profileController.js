const Profile = require('../models/Profile');
const User = require('../models/User');

// @desc    Get all profiles for a user
// @route   GET /api/profiles
// @access  Private
exports.getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create a new profile
// @route   POST /api/profiles
// @access  Private
exports.createProfile = async (req, res) => {
  try {
    // Check if user has reached the profile limit
    const canCreate = await Profile.checkProfileLimit(req.user._id);
    
    if (!canCreate) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the maximum number of profiles (5)'
      });
    }
    
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name for the profile'
      });
    }
    
    // Create new profile
    const profile = await Profile.create({
      owner: req.user._id,
      name
    });
    
    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get a single profile
// @route   GET /api/profiles/:id
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update a profile
// @route   PUT /api/profiles/:id
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name for the profile'
      });
    }
    
    // Find and update profile
    const profile = await Profile.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name },
      { new: true, runValidators: true }
    );
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete a profile
// @route   DELETE /api/profiles/:id
// @access  Private
exports.deleteProfile = async (req, res) => {
  try {
    // Find and delete profile
    const profile = await Profile.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};