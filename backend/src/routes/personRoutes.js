const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const auth = require('../middleware/auth');

router.post('/', auth, personController.create);
router.get('/', personController.findAll);
router.get('/stats', personController.getStats);
router.get('/:id', personController.findOne);
router.put('/:id', auth, personController.update);
router.delete('/:id', auth, personController.delete);

module.exports = router;