const Review = require('../models/Review');
const Content = require('../models/Content');
const Profile = require('../models/Profile');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { contentId, profileId, rating, review, isPublic } = req.body;
    
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    const profile = await Profile.findOne({ _id: profileId, user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or does not belong to you'
      });
    }
    
    const existingReview = await Review.findOne({
      user: req.user._id,
      profile: profileId,
      content: contentId
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this content with this profile'
      });
    }
    
    const newReview = await Review.create({
      user: req.user._id,
      profile: profileId,
      content: contentId,
      rating,
      review,
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews
// @access  Private
exports.getUserReviews = async (req, res) => {
  try {
    const { profileId } = req.query;
    
    const query = { user: req.user._id };
    if (profileId) query.profile = profileId;
    
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .populate('content', 'title posterPath type releaseDate')
      .populate('profile', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get reviews for a content
// @route   GET /api/reviews/content/:contentId
// @access  Private
exports.getContentReviews = async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const publicReviews = await Review.find({
      content: contentId,
      isPublic: true
    })
      .sort({ createdAt: -1 })
      .populate('profile', 'name avatar');
    
    const userPrivateReviews = await Review.find({
      content: contentId,
      user: req.user._id,
      isPublic: false
    })
      .sort({ createdAt: -1 })
      .populate('profile', 'name avatar');
    
    const allReviews = [...publicReviews, ...userPrivateReviews];
    
    res.status(200).json({
      success: true,
      count: allReviews.length,
      data: allReviews
    });
  } catch (error) {
    console.error('Error fetching content reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { rating, review, isPublic } = req.body;
    
    const existingReview = await Review.findById(req.params.id);
    
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    if (existingReview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }
    
    if (rating !== undefined) existingReview.rating = rating;
    if (review !== undefined) existingReview.review = review;
    if (isPublic !== undefined) existingReview.isPublic = isPublic;
    
    existingReview.updatedAt = Date.now();
    
    await existingReview.save();
    
    res.status(200).json({
      success: true,
      data: existingReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    await review.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};