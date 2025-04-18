const Profile = require('../models/Profile');
const User = require('../models/User');

// Helper function to get random avatar number (1-4)
const getRandomAvatar = () => Math.floor(Math.random() * 4) + 1;

// @desc    Create a new profile
// @route   POST /api/profiles
// @access  Private
exports.createProfile = async (req, res) => {
  try {
    // Check if user already has 5 profiles
    const profileCount = await Profile.countDocuments({ user: req.user.id });
    
    if (profileCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum profile limit (5) reached'
      });
    }

    // Get profile name from request body
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Profile name is required'
      });
    }

    // Create profile with random avatar
    const profile = await Profile.create({
      user: req.user.id,
      name,
      avatar: getRandomAvatar()
    });

    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (err) {
    // Handle duplicate profile name
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Profile with this name already exists for this user'
      });
    }

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get all profiles for current user
// @route   GET /api/profiles
// @access  Private
exports.getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get single profile
// @route   GET /api/profiles/:id
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if profile belongs to user
    if (profile.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this profile'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Update profile
// @route   PUT /api/profiles/:id
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    // Only allow name to be updated
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Profile name is required'
      });
    }

    let profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if profile belongs to user
    if (profile.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Update profile
    profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    // Handle duplicate profile name
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Profile with this name already exists for this user'
      });
    }

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Delete profile
// @route   DELETE /api/profiles/:id
// @access  Private
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if profile belongs to user
    if (profile.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this profile'
      });
    }

    await profile.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};