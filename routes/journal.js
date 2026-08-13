const express = require('express');
const router = express.Router();

const authentication = require('../source/Authentication')

const JournalService = require('../services/JournalService')


/**
 * Get all journal entries for the authenticated user
 */

router.get('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    let entries = await JournalService.getEntriesForUser(userId);
    return res.json(entries);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

/**
 * Get a single journal entry belonging to the authenticated user
 */

router.get('/:id', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    let entry = await JournalService.getEntryById(userId, req.params.id);

    if (!entry) {
      return res.status(404).send("Journal entry not found.");
    }

    return res.json(entry);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

/* Add a new journal entry for the authenticated user */
router.post('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    // Check if required fields are set
    if (!req.body.text || req.body.text.length === 0) {
      return res.status(400).send("Text not set.");
    }

    let entry = await JournalService.addEntry(userId, {
      title: req.body.title,
      categories: req.body.categories,
      text: req.body.text,
      meta: req.body.meta,
      entryDate: req.body.entryDate,
    });

    return res.json(entry);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

/* Update an existing journal entry belonging to the authenticated user */
router.put('/:id', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    let entry = await JournalService.updateEntry(userId, req.params.id, {
      title: req.body.title,
      categories: req.body.categories,
      text: req.body.text,
      meta: req.body.meta,
      entryDate: req.body.entryDate,
    });

    return res.json(entry);
  }
  catch(err) {
    if (err.message === "JOURNAL_ENTRY_NOT_FOUND") {
      return res.status(404).send("Journal entry not found.");
    }
    // Use Express default error handler
    return next(err)
  }
});

/* Delete a journal entry belonging to the authenticated user */
router.delete('/:id', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    await JournalService.deleteEntryById(userId, req.params.id);

    return res.status(200).send("Deleted.");
  }
  catch(err) {
    if (err.message === "JOURNAL_ENTRY_NOT_FOUND") {
      return res.status(404).send("Journal entry not found.");
    }
    // Use Express default error handler
    return next(err)
  }
});

module.exports = router;
