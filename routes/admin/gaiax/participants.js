const express = require('express');
const router = express.Router();
const authentication = require('../../../source/Authentication')
const DidService = require('../../../services/gaiax/DidService');
const GaiaXService = require('../../../services/gaiax/GaiaXService');

/**
 * POST: Create a Participant and related Gaia-X credentials
 */
router.post('/', [authentication.authenticateToken, authentication.authenticateAdmin], async function(req, res, next) {

    try {
        let certificates = req.body["certificateChain"];
        if (! certificates instanceof Array) {
            certificates = [certificates];
        }

        const privateKey = req.body["key"];
        const vatId = req.body["vatId"];
        const legalName = req.body["organizationName"];
        const countryCode = req.body["countryCode"];

        let urls = [];
        await DidService.createDid('default', certificates);
        urls.push(await GaiaXService.issueTermsAndConditions('default', privateKey));
        urls.push(await GaiaXService.issueLegalRegistrationNumber('default', vatId));
        urls.push(await GaiaXService.issueParticipant('default', privateKey, legalName, countryCode));
        urls.push(await GaiaXService.issueCompliance('default'));
        urls.push(await GaiaXService.issueDataResource('default', privateKey));
        urls.push(await GaiaXService.issueDataServiceOffering('default', privateKey));
        urls.push(await GaiaXService.issueDataAsset('default', privateKey));

        res.status(201).json({"urls": urls});
    }
    catch (err) {
        next(err)
    }
});


module.exports = router;