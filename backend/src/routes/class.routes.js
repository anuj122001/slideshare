const { Router } = require('express');
const { listClasses, createClass } = require('../controllers/class.controller');
const authenticate = require('../middleware/authenticate');
const requireRole  = require('../middleware/requireRole');

const router = Router();

router.get('/',  listClasses);
router.post('/', authenticate, requireRole('UPLOADER'), createClass);

module.exports = router;
