const express = require('express');
const { signup, login, verifyOtp, resendOtp } = require('../controllers/authController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/verify-otp', asyncHandler(verifyOtp));
router.post('/resend-otp', asyncHandler(resendOtp));

module.exports = router;
