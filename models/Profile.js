const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Profile name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  avatar: {
    type: Number,
    min: 1,
    max: 4,
    default: () => Math.floor(Math.random() * 4) + 1 // Random avatar between 1-4
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Content added to "My List"
  myList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }]
});

// Make sure user doesn't exceed 5 profiles
ProfileSchema.statics.checkProfileLimit = async function(userId) {
  const count = await this.countDocuments({ owner: userId });
  return count < 5;
};

// Add an index for name uniqueness per owner
ProfileSchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Profile', ProfileSchema);