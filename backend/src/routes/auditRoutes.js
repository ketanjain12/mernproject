const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { listAuditLogs } = require('../controllers/auditController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(auth);
router.use(requireRole('admin'));

router.get('/', asyncHandler(listAuditLogs));

module.exports = router;
