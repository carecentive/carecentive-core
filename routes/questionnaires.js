const express = require('express');
const router = express.Router();

const authentication = require('../source/Authentication')

const QuestionnaireService = require('../services/QuestionnaireService')



/**
 * Get a questionnaire
 */

 router.get('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;
    let questionnaireName = req.query.questionnaire;

    if (!questionnaireName) {
      return res.status(400).send("Respective parameters must be set."); 
    }

    let questionnaires = await QuestionnaireService.getQuestionnairebyName(userId, questionnaireName);
    return res.json(questionnaires);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

router.delete('/:id', authentication.authenticateToken, async function(req, res, next) {
  try {
    const userId = req.authData.user_id;

    if (!req.params.id) {
      return res.status(400).send("ID must be specified.");
    }

    await QuestionnaireService.deleteQuestionnaireById(userId, req.params.id);

    return res.status(200).send("Deleted.");
  }
  catch(err) {
    if (err.message === "QUESTIONNAIRE_NOT_FOUND") {
      // Same response whether the row is missing or owned by someone else, so
      // this endpoint cannot be used to probe for other users' questionnaire IDs.
      return res.status(404).send("Questionnaire not found.");
    }
    // Use Express default error handler
    return next(err)
  }
});

/* Add a new questionnaire to the database */
router.post('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    const userId = req.authData.user_id;

    // Check if required fields are set
    if (!req.body.questionnaireName || req.body.questionnaireName.length === 0) {
      return res.status(400).send("Questionnaire identifier must be set.");
    }

    if (!req.body.questionnaireData || req.body.questionnaireData.length === 0) {
      return res.status(400).send("Questionnaire data/content not set.");
    }

    await QuestionnaireService.addQuestionnaire(userId, req.body.questionnaireName, req.body.questionnaireData, req.body.questionnaireMeta);

    res.sendStatus(200);
  }
  catch(err) {
    return next(err)
  }
});

module.exports = router;
