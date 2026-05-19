const express = require('express');
const router = express.Router();
const { getAllBuses, searchBuses, addBus, deleteBus } = require('../controllers/busController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getAllBuses);
router.get('/search', searchBuses);
router.post('/add', protect, adminOnly, addBus);
router.delete('/:id', protect, adminOnly, deleteBus);

module.exports = router;
