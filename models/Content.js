const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  tmdbId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['movie', 'tv'],
    required: true
  },
  overview: {
    type: String,
    required: true
  },
  posterPath: {
    type: String,
    default: null
  },
  backdropPath: {
    type: String,
    default: null
  },
  releaseDate: {
    type: Date,
    default: null
  },
  genres: [{
    id: Number,
    name: String
  }],
  runtime: {
    type: Number,
    default: null
  },
  popularity: {
    type: Number,
    default: 0
  },
  voteAverage: {
    type: Number,
    default: 0
  },
  voteCount: {
    type: Number,
    default: 0
  },
  cast: [{
    id: Number,
    name: String,
    character: String,
    profilePath: String
  }],
  crew: [{
    id: Number,
    name: String,
    job: String,
    profilePath: String
  }],
  // For TV shows only
  seasons: [{
    id: Number,
    name: String,
    episodeCount: Number,
    overview: String,
    posterPath: String,
    airDate: Date,
    episodes: [{
      id: Number,
      name: String,
      overview: String,
      stillPath: String,
      airDate: Date,
      episodeNumber: Number,
      seasonNumber: Number
    }]
  }],
  // Additional fields for AI recommendations
  keywords: [{
    id: Number,
    name: String
  }],
  // Fields for management
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  featured: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
ContentSchema.index({ type: 1, genres: 1 });
ContentSchema.index({ popularity: -1 });
ContentSchema.index({ releaseDate: -1 });
ContentSchema.index({ featured: 1 });

module.exports = mongoose.model('Content', ContentSchema);