const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(auth);
router.use(requireRole('admin'));

router.get('/', asyncHandler(listUsers));
router.post('/', asyncHandler(createUser));
router.put('/:id', asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));

module.exports = router;
