const express = require('express');
const router = express.Router();
const authentication = require('../../source/Authentication')
const DataProductValidator = require('../../validators/admin/DataProductValidator');
const DataContractProposalValidator = require('../../validators/DataContractProposalValidator');
const SignedDataContractValidator = require('../../validators/SignedDataContractValidator');
const withErrorHandler = require('../../source/errorHandler');
const DataProductService = require('../../services/gaiax/DataProductService');
const DataProductContractService = require('../../services/gaiax/DataProductContractService');
const DataProductContract = require("../../models/DataProductContract");
const DataProduct = require("../../models/DataProduct");
const GaiaXService = require("../../services/gaiax/GaiaXService");
const Errors = require("../../source/Errors");


/**
 * GET: Retrieve DataProducts
 */
router.get('/', withErrorHandler(async function(req, res, next) {
    let dataProducts = await DataProduct.query()
        .select('id', 'participant_id', 'title', 'description', 'route', 'created_at', 'updated_at')
        .withGraphFetched('participant');
    res.status(200).json(dataProducts.map(p => GaiaXService.embedDataProductUrls(p)));
}));

/**
 * GET: Retrieve a single DataProduct
 */
router.get('/:dataProductId', withErrorHandler(async function(req, res, next) {
    let dataProductId = req.params["dataProductId"];

    if (!dataProductId) {
        throw new Errors.MissingParamError("A DataProduct ID must be provided.");
    }

    let dataProduct = await DataProduct.query()
        .findById(dataProductId)
        .withGraphFetched('participant')
        .throwIfNotFound();
    res.status(200).json(GaiaXService.embedDataProductUrls(dataProduct));
}));

/**
 * POST: Create a DataProduct and related Gaia-X credentials
 */
router.post('/', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    const validatedData = await DataProductValidator.getValidatedData(req);
    const dataProduct = await DataProductService.store(validatedData);

    res.status(201).json(dataProduct);
}));

/**
 * POST: Creates a DataProduct contract proposal
 */
router.post('/:dataProductId/contracts', [authentication.authenticateToken, authentication.authenticateAdmin], withErrorHandler(async function(req, res, next) {
    let dataProductId = req.params["dataProductId"];

    if (!dataProductId) {
        throw new Errors.MissingParamError("A DataProduct ID must be provided.");
    }

    let dataProduct = await DataProduct.query()
        .findById(dataProductId)
        .withGraphFetched('participant')
        .throwIfNotFound();

    const validatedData = await DataContractProposalValidator.getValidatedData(req);
    const [dataProductContract, contractProposal] = await DataProductContractService.createContractProposal(dataProduct, validatedData);

    res.status(201).json({id: dataProductContract['id'], dataProductContractCredential: contractProposal});
}));

/**
 * PUT: Publishes a signed DataProductContract
 */
router.put('/:dataProductId/contracts/:contractId', withErrorHandler(async function(req, res, next) {
    let dataProductId = req.params["dataProductId"];
    let contractId = req.params["contractId"];

    if (!dataProductId || !contractId) {
        throw new Errors.MissingParamError("A DataProduct ID and contract ID must be provided.");
    }

    let contract = await DataProductContract.query()
        .findById(contractId)
        .throwIfNotFound();
    if(contract['data_product_id'] !== dataProductId) {
        throw new Errors.NotFoundError("Contract with provided ID and DataProduct ID was not found.");
    }

    if(contract['state'] !== DataProductContract.STATE_CONSUMER_SIGNATURE_PENDING) {
        throw new Errors.ClientError(`Contract must be in a state "${DataProductContract.STATE_CONSUMER_SIGNATURE_PENDING}"`);
    }

    const validatedData = await SignedDataContractValidator.getValidatedData(req);
    await DataProductContractService.verifyContractSignatureAndStore(validatedData, contract);

    res.status(200).json({message: "The contract signature was successfully verified. Please wait until the data producer co-signs the contract."});
}));

/**
 * GET: Claims a signed DataProductContract from both consumer and producer
 */
router.get('/:dataProductId/contracts/:contractId', withErrorHandler(async function(req, res, next) {
    let dataProductId = req.params["dataProductId"];
    let contractId = req.params["contractId"];

    if (!dataProductId || !contractId) {
        throw new Errors.MissingParamError("A DataProduct ID and contract ID must be provided.");
    }

    let contract = await DataProductContract.query()
        .findById(contractId)
        .throwIfNotFound();
    if(contract['data_product_id'] !== dataProductId) {
        throw new Errors.NotFoundError("Contract with provided ID and DataProduct ID was not found.");
    }

    if(contract['state'] === DataProductContract.STATE_CONSUMER_SIGNATURE_PENDING) {
        throw new Errors.ClientError("You first have to sign the contract and publish it.");
    }

    if(contract['state'] === DataProductContract.STATE_PRODUCER_SIGNATURE_PENDING) {
        throw new Errors.ClientError("Waiting until the producer co-signs the contract.");
    }

    if(contract['state'] === DataProductContract.STATE_REJECTED) {
        throw new Errors.ClientError("The data producer rejected the contract.");
    }

    if(contract['state'] === DataProductContract.STATE_FINALIZED) {
        throw new Errors.ClientError("The contract has already been claimed.");
    }
    const authHeader = req.headers.authorization;
    if (! authHeader) {
        throw new Errors.AuthenticationMissingError("Please provide your jws signature as a bearer token");
    }
    const token = String(authHeader).replace(/^Bearer /g, '');
    if(token !== contract['consumer_proof_signature']) {
        throw new Errors.AuthorizationError("Your signature doesn't match the contract signature");
    }

    res.status(200).json(await DataProductContractService.getContract(contract));
}));

module.exports = router;