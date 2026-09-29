const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getInsights,
  generateInsights,
  togglePin,
  dismissInsight,
} = require('../controllers/insightController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getInsights);
router.post('/generate', generateInsights);
router.put('/:id/bookmark', togglePin);
router.put('/:id/dismiss', dismissInsight);

router.get('/tips', (req, res, next) => {
  req.query.type = 'saving_tip';
  next();
}, getInsights);
router.put('/tips/:id/pin', togglePin);
router.put('/tips/:id/dismiss', dismissInsight);

module.exports = router;
