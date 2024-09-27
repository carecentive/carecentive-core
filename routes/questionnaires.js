const express = require('express');
const router = express.Router();
const authentication = require('../source/Authentication')
const QuestionnaireService = require('../services/QuestionnaireService')
const withErrorHandler = require('../source/errorHandler');


/**
 * Get a questionnaire
 */
router.get('/', authentication.authenticateThirdPartyOrToken, withErrorHandler(async function (req, res, next) {

    // dump data for third parties
    if (req.authData.thirdParty) {
        return res.json(await QuestionnaireService.getAllQuestionnaires());
    }

    let userId = req.authData.user_id;
    let questionnaireName = req.query.questionnaire;

    if (!questionnaireName) {
        return res.status(400).send("Respective parameters must be set.");
    }

    let questionnaires = await QuestionnaireService.getQuestionnaireByName(userId, questionnaireName);
    return res.json(questionnaires);

}));

/**
 * Delete a questionnaire
 */
router.delete('/:id', authentication.authenticateToken, withErrorHandler(async function (req, res, next) {
    let userId = req.authData.user_id;

    if (!req.params.id) {
        return res.status(400).send("ID must be specified.");
    }

    await QuestionnaireService.deleteQuestionnaireById(id);

    return res.status(200).send("Deleted.");
}));

/**
 * Add a new questionnaire to the database
 */
router.post('/', authentication.authenticateToken, withErrorHandler(async function (req, res, next) {
    let userId = req.authData.user_id;
    let nowTimestamp = new Date();

    // Check if required fields are set
    if (!req.body.questionnaireName || req.body.questionnaireName.length === 0) {
        return res.status(400).send("Questionnaire identifier must be set.");
    }

    if (!req.body.questionnaireData || req.body.questionnaireData.length === 0) {
        return res.status(400).send("Questionnaire data/content not set.");
    }

    QuestionnaireService.addQuestionnaire(userId, req.body.questionnaireName, req.body.questionnaireData, req.body.questionnaireMeta);

    res.sendStatus(200);
}));

module.exports = router;
