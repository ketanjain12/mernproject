const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  assignDomains,
  getAssignedDomains,
  getMyDomains,
} = require('../controllers/domainController');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(auth);

router.get('/mine', asyncHandler(getMyDomains));
router.get('/user/:userId', asyncHandler(getAssignedDomains));

router.get('/', requireRole('admin'), asyncHandler(listDomains));
router.post('/', requireRole('admin'), asyncHandler(createDomain));
router.put('/:id', requireRole('admin'), asyncHandler(updateDomain));
router.delete('/:id', requireRole('admin'), asyncHandler(deleteDomain));
router.post('/assign/:userId', requireRole('admin'), asyncHandler(assignDomains));

module.exports = router;
