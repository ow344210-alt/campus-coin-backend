const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMe: getProfile,
  updateMe: updateProfile,
  changePassword,
} = require('../controllers/authController');

const router = express.Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
