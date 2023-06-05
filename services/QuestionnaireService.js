const Questionnaire = require('../models/Questionnaire');


class QuestionnaireService {

  static async getQuestionnairebyName(userId, questionnaireName) {
    let questionnaires = await Questionnaire.query().where('user_id', userId).where('questionnaire', questionnaireName);
    return questionnaires;
  }

  static async deleteQuestionnaireById(questionnaireId) {
    let questionnaire = await Questionnaire.query().findById(req.params.id);

    if (questionnaire.user_id !== userId) {
      throw new Error("QUESTIONNAIRE_DELETION_NOT_ALLOWED")
    }

    let deleted = await Questionnaire.query().deleteById(req.params.id);

    if ( deleted ) {
      return;
    }
    else {
      throw new Error("QUESTIONNAIRE_DELETION_ERROR")
    }
  }

  static async addQuestionnaire(userId, name, data, meta) {
    let nowTimestamp = new Date();

    await Questionnaire.query().insert({
      user_id: userId,
      datetime: nowTimestamp,
      questionnaire: name,
      data: JSON.stringify(data),
      meta: JSON.stringify(meta),
    });    
  }
}

module.exports = QuestionnaireService;