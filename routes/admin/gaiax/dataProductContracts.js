const express = require('express');
const router = express.Router();
const authentication = require('../../../source/Authentication')
const DataContractForSigningValidator = require('../../../validators/admin/DataContractForSigningValidator');
const withErrorHandler = require('../../../source/errorHandler');
const DataProductContractService = require('../../../services/gaiax/DataProductContractService');
const DataProductContract = require("../../../models/DataProductContract");
const Errors = require("../../../source/Errors");


/**
 * GET: Retrieve DataProduct Contracts
 */
router.get('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let dataProductContracts = await DataProductContract.query()
        .select('id', 'state', 'data_product_id', 'consumer_participant', 'consumer_did', 'created_at', 'updated_at');
    res.status(200).json(dataProductContracts);
}));

/**
 * GET: Retrieve a single DataProductContract
 */
router.get('/:dataProductContractId', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let contractId = req.params["dataProductContractId"];

    if (!contractId) {
        throw new Errors.MissingParamError("A DataProductContract ID must be provided.");
    }

    let dataProductContract = await DataProductContract.query()
        .findById(contractId)
        .throwIfNotFound();
    res.status(200).json(dataProductContract);
}));

/**
 * PUT: Sign a DataProductContract
 */
router.put('/:dataProductContractId', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let contractId = req.params["dataProductContractId"];

    if (!contractId) {
        throw new Errors.MissingParamError("A DataProductContract ID must be provided.");
    }

    let dataProductContract = await DataProductContract.query()
        .findById(contractId)
        .withGraphFetched('data_product.participant')
        .throwIfNotFound();

    if(dataProductContract['state'] !== DataProductContract.STATE_PRODUCER_SIGNATURE_PENDING) {
        throw new Errors.ClientError(`Contract must be in a state "${DataProductContract.STATE_PRODUCER_SIGNATURE_PENDING}"`);
    }
    let validatedData = await DataContractForSigningValidator.getValidatedData(req);

    res.status(200).json(await DataProductContractService.signContract(dataProductContract, validatedData['privateKey']));
}));

/**
 * DELETE: Reject a DataProductContract
 */
router.delete('/:dataProductContractId', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let contractId = req.params["dataProductContractId"];

    if (!contractId) {
        throw new Errors.MissingParamError("A DataProductContract ID must be provided.");
    }

    let dataProductContract = await DataProductContract.query()
        .findById(contractId)
        .throwIfNotFound();

    if(dataProductContract['state'] === DataProductContract.STATE_FINALIZED) {
        throw new Errors.ClientError("Contract is finalized and cannot be rejected");
    }

    if(dataProductContract['state'] === DataProductContract.STATE_REJECTED) {
        throw new Errors.ClientError("Contract is already rejected");
    }

    res.status(200).json(await DataProductContractService.rejectContract(dataProductContract));
}));


module.exports = router;