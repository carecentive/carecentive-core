const express = require('express');
const router = express.Router();
const path = require('path');
const multiparty = require('multiparty');
const fs = require('fs');
var util = require('util');
var logger = require('winston');
const moment = require('moment');

const authentication = require('../source/Authentication')

const FileService = require('../services/FileService');

/* Add a new questionnaire to the database */
router.post('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    var form = new multiparty.Form();

    await form.parse(req, async function(err, fields, files) {

      if (!process.env.PROJECT_PATH) {
        res.status(500).send("PROJECT_PATH_NOT_DEFINED");
      }
  
      if (!fields.type || fields.type.length === 0) {
        return res.status(400).send("File type must be set.");
      }

      if (!files.data) {
        return res.status(400).send("File data/content not present.");
      }

      var savePath = path.join(process.env.PROJECT_PATH, "/uploads/")  

      let fileId = await FileService.uploadFile(userId, fields.type[0], files.data[0], savePath);

      res.status(200).json({fileId: fileId});
    });
  }
  catch(err) {
    return next(err)
  }
});

module.exports = router;
