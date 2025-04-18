const express = require('express');
const {
  getProfiles,
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all profiles and create new profile
router.route('/')
  .get(getProfiles)
  .post(createProfile);

// Get, update and delete profile
router.route('/:id')
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteProfile);

module.exports = router;