const express = require('express');
const router = express.Router();
const authentication = require('../../source/Authentication')
const ThirdPartyToken = require('../../models/ThirdPartyToken');
const ThirdPartyTokenValidator = require('../../validators/admin/ThirdPartyTokenValidator');
const ThirdPartyTokenService = require("../../services/ThirdPartyTokenService");
const withErrorHandler = require('../../source/errorHandler');
const Errors = require("../../source/Errors");

/**
 * GET: Retrieve third party authentication tokens
 */
router.get('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function (req, res, next) {
    let thirdPartyTokens = await ThirdPartyToken.query().select('id', 'active', 'valid_till', 'access_token', 'created_at', 'updated_at');
    return res.json(thirdPartyTokens);
}));

/**
 * GET: Retrieve a single third party authentication token
 */
router.get('/:tokenId', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let tokenId = parseInt(req.params["tokenId"]);

    if (!tokenId) {
        throw new Errors.MissingParamError("An integer token ID must be provided.");
    }

    let token = await ThirdPartyToken.query()
        .findById(tokenId)
        .throwIfNotFound();
    res.status(200).json(token);
}));

/**
 * POST: Create a third party authentication token
 */
router.post('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function (req, res, next) {
    let validatedData = await ThirdPartyTokenValidator.getValidatedData(req);
    let created = await ThirdPartyTokenService.store(validatedData);
    return res.status(201).json(created);
}));


module.exports = router;