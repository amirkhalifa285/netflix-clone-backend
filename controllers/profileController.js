const Profile = require('../models/Profile');
const User = require('../models/User');

// @desc    Get all profiles for a user
// @route   GET /api/profiles
// @access  Private
exports.getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ user: req.user._id })
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
    // Verify user exists and is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated or user session invalid'
      });
    }

    const count = await Profile.countDocuments({ user: req.user._id });
    if (count >= 5) {
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
    
    // Check if profile with same name already exists FOR THIS USER
    const existingProfile = await Profile.findOne({
      user: req.user._id,
      name: name.trim()
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'A profile with this name already exists for your account'
      });
    }

    const profile = new Profile({
      user: req.user._id,
      name: name.trim()
    });
    
    await profile.save();
    
    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    
    // Check if this is a duplicate key error
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.user && error.keyPattern.name) {
        return res.status(400).json({
          success: false,
          message: 'A profile with this name already exists for your account'
        });
      }
    }
    
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
      user: req.user._id
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
    
    // Check if another profile with this name already exists for this user
    const existingProfile = await Profile.findOne({
      user: req.user._id,
      name: name.trim(),
      _id: { $ne: req.params.id } // Exclude the current profile
    });
    
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'A profile with this name already exists for your account'
      });
    }
    
    const profile = await Profile.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name: name.trim() },
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
    
    // Check if this is a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A profile with this name already exists for your account'
      });
    }
    
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
    const profile = await Profile.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
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