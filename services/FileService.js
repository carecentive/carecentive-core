const File = require('../models/File');
const path = require('path');
const moment = require('moment');
const util = require('util');

const mv = require('mv');

class FileService {

  static async uploadFile(userId, type, file, carecentiveUploadDirectory) {

    // Prepare new fileref
    let nowTimestamp = new Date();

    // Create a YYYYMMDDHHMMSS String - which is messy in JS without 3rd party dependencies
    // let stringDatetime = String(nowTimestamp.getFullYear()) + String(nowTimestamp.getMonth()) + String(nowTimestamp.getHours()) + String(nowTimestamp.getMinutes()) + String(nowTimestamp.getSeconds());
    // let stringDate = nowTimestamp.toLocaleString("fr-CA").split(" ")[0].replace(/(-|,/)/g, "")
    // let stringTime = nowTimestamp.toLocaleString("de-DE").split(" ")[1].replace(/:_\//g, "")
    let now_string = moment().format("YYYYMMDD_HHmmss");
    let fileref = (userId + "_" + now_string + "_" + type + path.extname(file.originalFilename) + ".unsafe");

    // Move file into correct folder
    var oldPath = file.path;
    var newPath = path.join(carecentiveUploadDirectory, fileref)

    /**
     * Promisify mv
     */
    const mvPromise = (...args) => {
      return new Promise((resolve, reject) => {
        mv(...args, (data, err) => {
          if(err) return reject(err);
          resolve(data);
        })
      })
    }

    try {
      await mvPromise(oldPath, newPath)
    }
    catch(e) {
      throw new Error("FILE_MOVE_ERROR")
    }
            
    // Store questionnaire data in database
    let newEntry = await File.query().insert({
      user_id: userId,
      datetime: nowTimestamp,
      type: type,
      fileref: fileref
    });

    return newEntry.id;
  }
}

module.exports = FileService;