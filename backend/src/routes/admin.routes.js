const { Router } = require('express');
const { promoteUser, demoteUser, listUsers } = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const requireRole  = require('../middleware/requireRole');

const router = Router();

router.use(authenticate, requireRole('UPLOADER'));

router.get('/users',         listUsers);
router.post('/users/promote', promoteUser);
router.post('/users/demote',  demoteUser);

module.exports = router;
