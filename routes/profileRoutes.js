const express = require('express');
const { 
  createProfile, 
  getProfiles, 
  getProfile, 
  updateProfile, 
  deleteProfile 
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes
router.route('/')
  .get(getProfiles)
  .post(createProfile);

router.route('/:id')
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteProfile);

module.exports = router;