const { Model } = require('objection');

class SensorData extends Model {
  static get tableName() {
    return 'sensor_data';
  }

  static get idColumn() {
    return 'id'; // Primary key
  }
}

module.exports = SensorData;