const Settings = require('../models/Setting');

class SettingsService {

  static async getSettingsAsKeyValuePairs(userId) {
    let settings = await Settings.query().where('user_id', userId);

    // Format as key-value-pairs (using the setting name as key and the actual data as value)
    let keyValuePairs = {};
    for (let el of settings) {
      keyValuePairs[el.key] = el.data;
    }

    return keyValuePairs;
  }

  static async getSetting(userId, key) {
    if(userId === undefined) return;

    let settings;

    if(key === undefined) {
      settings = await Settings.query().where('user_id', userId)
    }

    else {
      let settingsDbRow = await Settings.query().findOne({user_id: userId, key: key});

      if(settingsDbRow) {
        settings = settingsDbRow.data
      }
    }

    return settings;
  }

  static async updateOrCreateSetting(userId, key, data) {
    if(userId === undefined) throw new Error("User ID not set.");
    if(key === undefined) throw new Error("Key not set.");
    if(data === undefined) throw new Error("Data not set.");

    // Try to update existing row
    let patchOperationResult = await Settings.query().findOne({
      user_id: userId,
      key: key
    }).patch({
      user_id: userId,
      key: key,
      data: data
    })

    // If existing row does not exist (findOne operation returns 0), create a new one
    if (patchOperationResult === 0) {
      await Settings.query().insert({
        user_id: userId,
        // datetime: nowTimestamp,
        key: key,
        data: data
      });  
    }
  }
}

module.exports = SettingsService;