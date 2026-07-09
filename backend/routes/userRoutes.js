const express = require('express');
const router = express.Router();
const {
  loginOrRegisterUser,
  getUserProfile,
  addAddress,
  toggleWishlist
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/auth', loginOrRegisterUser);
router.get('/profile', protect, getUserProfile);
router.post('/address', protect, addAddress);
router.post('/wishlist', protect, toggleWishlist);

module.exports = router;