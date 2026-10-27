const express3 = require('express');
const router3 = express3.Router();
const { protect: protect3 } = require('../middleware/auth');
const {
  addAccess,
  removeAccess,
  getAccessList,
  checkAccess
} = require('../controllers/accessController');

router3.post('/:fileId/add', protect3, addAccess);
router3.post('/:fileId/remove', protect3, removeAccess);
router3.get('/:fileId', protect3, getAccessList);
router3.get('/:fileId/check', protect3, checkAccess);

module.exports = router3;