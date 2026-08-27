const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const auth = require('../middleware/auth');

router.get('/states', caseController.getAllStates);
router.get('/state/:state', caseController.getCasesByState);
router.put('/:id/status', auth, caseController.updateCaseStatus);

module.exports = router;