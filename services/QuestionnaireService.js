const Questionnaire = require('../models/Questionnaire');


class QuestionnaireService {

  static async getQuestionnairebyName(userId, questionnaireName) {
    let questionnaires = await Questionnaire.query().where('user_id', userId).where('questionnaire', questionnaireName);
    return questionnaires;
  }

  static async deleteQuestionnaireById(userId, questionnaireId) {
    const questionnaire = await Questionnaire.query().findById(questionnaireId);

    // Treat "does not exist" and "not owned by this user" identically.
    if (!questionnaire || questionnaire.user_id !== userId) {
      throw new Error("QUESTIONNAIRE_NOT_FOUND");
    }

    // Scope the delete by user_id as well, as defence in depth against a race
    // between the ownership check and the delete.
    const deleted = await Questionnaire.query()
      .delete()
      .where({ id: questionnaireId, user_id: userId });

    if (!deleted) {
      throw new Error("QUESTIONNAIRE_DELETION_ERROR");
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