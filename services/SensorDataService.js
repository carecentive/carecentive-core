const SensorData = require('../models/SensorData');

class SensorDataService {

  static async addSensorData(datetimeReported, sensorIdentifier, data, meta) {
    let nowTimestamp = new Date();

    await SensorData.query().insert({
      datetime_received: nowTimestamp,
      datetime_reported: datetimeReported,
      sensor_identifier: sensorIdentifier,
      data: JSON.stringify(data),
      meta: JSON.stringify(meta),
    });    
  }
}

module.exports = SensorDataService;