const express = require('express');
const auth = require('../middleware/auth');
const { getMe, updateMe, changePassword } = require('../controllers/meController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(auth);

router.get('/', asyncHandler(getMe));
router.put('/', asyncHandler(updateMe));
router.post('/change-password', asyncHandler(changePassword));

module.exports = router;
