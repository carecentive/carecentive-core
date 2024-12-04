const Questionnaire = require('../models/Questionnaire');


class QuestionnaireService {

  /**
   * Fetches all questionnaires
   *
   * @returns {Objection.QueryBuilder<Questionnaire, Questionnaire[]>}
   */
  static async getAllQuestionnaires() {
    return Questionnaire.query();
  }

  static async getQuestionnaireByName(userId, questionnaireName) {
    return Questionnaire.query().where('user_id', userId).where('questionnaire', questionnaireName);
  }

  static async deleteQuestionnaireById(questionnaireId) {
    let questionnaire = await Questionnaire.query().findById(req.params.id);

    if (questionnaire.user_id !== userId) {
      throw new Error("QUESTIONNAIRE_DELETION_NOT_ALLOWED")
    }

    let deleted = await Questionnaire.query().deleteById(req.params.id);

    if (! deleted) {
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