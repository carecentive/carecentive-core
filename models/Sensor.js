const { Model } = require('objection');

class Sensor extends Model {
  static get tableName() {
    return 'sensors';
  }

  static get idColumn() {
    return 'id'; // Primary key
  }
}

module.exports = Sensor;