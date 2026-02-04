const express = require('express');
const { signup, login } = require('../controllers/authController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));

module.exports = router;
