const express = require('express');
const {
  requestResetLink,
  resetPasswordWithLink,
  requestResetOtp,
  resetPasswordWithOtp,
} = require('../controllers/passwordResetController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.post('/forgot-password/link', asyncHandler(requestResetLink));
router.post('/reset-password/link', asyncHandler(resetPasswordWithLink));
router.post('/forgot-password/otp', asyncHandler(requestResetOtp));
router.post('/reset-password/otp', asyncHandler(resetPasswordWithOtp));

module.exports = router;
