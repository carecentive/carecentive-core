const express = require('express');
const router = express.Router();
const SignedDataContractValidator = require('../../validators/SignedDataContractValidator');
const DataProductContractService = require("../../services/gaiax/DataProductContractService");
const withErrorHandler = require('../../source/errorHandler');

/**
 * POST: Create a third party authentication token
 */
router.post('/', withErrorHandler(async function (req, res, next) {
    let validatedData = await SignedDataContractValidator.getValidatedData(req, 2);
    let created = await DataProductContractService.issueAccessToken(validatedData);
    return res.status(201).json(created);
}));


module.exports = router;