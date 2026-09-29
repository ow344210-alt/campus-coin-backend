const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getDefaultCategories,
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  getUsers,
  disableUser,
  deleteUser,
  resetUserPassword,
  getStats,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/categories', getDefaultCategories);
router.post('/categories', createDefaultCategory);
router.put('/categories/:id', updateDefaultCategory);
router.delete('/categories/:id', deleteDefaultCategory);

router.get('/users', getUsers);
router.put('/users/:id/disable', disableUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/reset-password', resetUserPassword);

router.get('/stats', getStats);

router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

module.exports = router;
