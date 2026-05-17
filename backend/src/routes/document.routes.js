const { Router } = require('express');
const {
  getPresignedUrl,
  saveMetadata,
  listDocuments,
  getDownloadUrl,
  deleteDocument,
  myDocuments,
} = require('../controllers/document.controller');
const authenticate = require('../middleware/authenticate');
const requireRole  = require('../middleware/requireRole');

const router = Router();

router.get('/',                    listDocuments);
router.get('/mine',                authenticate, myDocuments);
router.post('/presigned-url',      authenticate, requireRole('UPLOADER'), getPresignedUrl);
router.post('/save-metadata',      authenticate, requireRole('UPLOADER'), saveMetadata);
router.get('/:id/download',        getDownloadUrl);
router.delete('/:id',              authenticate, requireRole('UPLOADER'), deleteDocument);

module.exports = router;
