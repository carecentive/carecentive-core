const express = require('express');
const router = express.Router();
const authentication = require('../../../source/Authentication')
const ParticipantService = require('../../../services/gaiax/ParticipantService');
const GaiaXService = require('../../../services/gaiax/GaiaXService');
const ParticipantValidator = require('../../../validators/admin/ParticipantValidator');
const withErrorHandler = require('../../../source/errorHandler');
const Participant = require("../../../models/Participant");
const Errors = require("../../../source/Errors");

/**
 * GET: Retrieve Participants
 */
router.get('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let participants = await Participant.query().select('id', 'slug', 'created_at', 'updated_at');
    res.status(200).json(participants.map(p => GaiaXService.embedUrls(p)));
}));

/**
 * GET: Retrieve a single Participant
 */
router.get('/:participantId', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let participantId = parseInt(req.params["participantId"]);

    if (!participantId) {
        throw new Errors.MissingParamError("An integer Participant ID must be provided.");
    }

    let participant = await Participant.query()
        .findById(participantId)
        .throwIfNotFound();
    res.status(200).json(GaiaXService.embedUrls(participant));
}));

/**
 * POST: Create a Participant and related Gaia-X credentials
 */
router.post('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    const validatedData = await ParticipantValidator.getValidatedData(req);

    res.status(201).json(await ParticipantService.store(validatedData));
}));


module.exports = router;