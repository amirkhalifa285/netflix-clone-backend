const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Profile name is required'],
    trim: true,
    maxlength: [50, 'Profile name cannot be more than 50 characters']
  },
  avatar: {
    type: Number,
    min: 1,
    max: 4, // We have 4 avatar options as per the requirements
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can't create multiple profiles with the same name
ProfileSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Profile', ProfileSchema);