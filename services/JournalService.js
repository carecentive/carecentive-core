const JournalEntry = require('../models/JournalEntry');


class JournalService {

  static async getEntriesForUser(userId) {
    let entries = await JournalEntry.query().where('user_id', userId).orderBy('entry_date', 'desc');
    return entries;
  }

  static async getEntryById(userId, entryId) {
    let entry = await JournalEntry.query().findById(entryId);

    if (!entry || entry.user_id !== userId) {
      return undefined;
    }

    return entry;
  }

  static async addEntry(userId, { title, categories, text, meta, entryDate }) {
    if (!text) {
      throw new Error("JOURNAL_ENTRY_TEXT_NOT_SET");
    }

    let entry = await JournalEntry.query().insert({
      user_id: userId,
      title: title,
      categories: categories !== undefined ? JSON.stringify(categories) : null,
      text: text,
      meta: meta !== undefined ? JSON.stringify(meta) : null,
      entry_date: entryDate ? new Date(entryDate) : new Date(),
    });

    return entry;
  }

  static async updateEntry(userId, entryId, { title, categories, text, meta, entryDate }) {
    let entry = await JournalEntry.query().findById(entryId);

    if (!entry || entry.user_id !== userId) {
      throw new Error("JOURNAL_ENTRY_NOT_FOUND");
    }

    let patch = {};
    if (title !== undefined) patch.title = title;
    if (categories !== undefined) patch.categories = JSON.stringify(categories);
    if (text !== undefined) patch.text = text;
    if (meta !== undefined) patch.meta = JSON.stringify(meta);
    if (entryDate !== undefined) patch.entry_date = new Date(entryDate);

    await JournalEntry.query().findById(entryId).patch(patch);

    return JournalEntry.query().findById(entryId);
  }

  static async deleteEntryById(userId, entryId) {
    let entry = await JournalEntry.query().findById(entryId);

    if (!entry || entry.user_id !== userId) {
      throw new Error("JOURNAL_ENTRY_NOT_FOUND");
    }

    let deleted = await JournalEntry.query().deleteById(entryId);

    if (!deleted) {
      throw new Error("JOURNAL_ENTRY_DELETION_ERROR");
    }
  }
}

module.exports = JournalService;
