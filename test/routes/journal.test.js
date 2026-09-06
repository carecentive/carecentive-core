/**
 * Contract test for routes/journal.js (full CRUD). Asserts the HTTP response
 * and the persisted `user_journal_entries` row, plus that entries of another
 * user are invisible / untouchable (404, never 403 — no ID probing).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, destroyTestDb, buildTestApp, createUser, authCookie } = require('../../testing');
const journalRouter = require('../../routes/journal');
const JournalEntry = require('../../models/JournalEntry');

test('routes/journal', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/journal', router: journalRouter }]);
  const alice = await createUser({ name: 'alice-j' });
  const bob = await createUser({ name: 'bob-j' });
  const aliceCookie = authCookie(alice);

  await t.test('GET / without a token is rejected with 401', async () => {
    assert.equal((await request(app).get('/api/journal')).status, 401);
  });

  await t.test('POST / rejects an entry with no text (400)', async () => {
    const res = await request(app).post('/api/journal').set('Cookie', [aliceCookie]).send({ title: 'x' });
    assert.equal(res.status, 400);
    assert.equal(await JournalEntry.query().resultSize(), 0);
  });

  let entryId;

  await t.test('POST / stores the entry for the caller', async () => {
    const res = await request(app)
      .post('/api/journal')
      .set('Cookie', [aliceCookie])
      .send({ title: 'Monday', text: 'Felt good', categories: ['mood'], entryDate: '2024-01-01' });
    assert.equal(res.status, 200);
    entryId = res.body.id;

    const row = await JournalEntry.query().findById(entryId);
    assert.equal(row.user_id, alice.id);
    assert.equal(row.text, 'Felt good');
    assert.deepEqual(JSON.parse(row.categories), ['mood']);
  });

  await t.test('GET / lists the caller\'s entries, newest entry_date first', async () => {
    await request(app)
      .post('/api/journal')
      .set('Cookie', [aliceCookie])
      .send({ text: 'Later entry', entryDate: '2024-06-01' });

    const res = await request(app).get('/api/journal').set('Cookie', [aliceCookie]);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.equal(res.body[0].text, 'Later entry', 'ordered by entry_date desc');
  });

  await t.test('GET /:id returns the caller\'s entry but 404s on another user\'s', async () => {
    assert.equal((await request(app).get(`/api/journal/${entryId}`).set('Cookie', [aliceCookie])).status, 200);

    const bobsEntry = await JournalEntry.query().insert({ user_id: bob.id, text: 'private', entry_date: new Date() });
    assert.equal((await request(app).get(`/api/journal/${bobsEntry.id}`).set('Cookie', [aliceCookie])).status, 404);
  });

  await t.test('PUT /:id updates the caller\'s entry; another user\'s is 404 and untouched', async () => {
    const res = await request(app)
      .put(`/api/journal/${entryId}`)
      .set('Cookie', [aliceCookie])
      .send({ text: 'Edited' });
    assert.equal(res.status, 200);
    assert.equal((await JournalEntry.query().findById(entryId)).text, 'Edited');

    const bobsEntry = await JournalEntry.query().insert({ user_id: bob.id, text: 'keep', entry_date: new Date() });
    assert.equal(
      (await request(app).put(`/api/journal/${bobsEntry.id}`).set('Cookie', [aliceCookie]).send({ text: 'hacked' })).status,
      404
    );
    assert.equal((await JournalEntry.query().findById(bobsEntry.id)).text, 'keep');
  });

  await t.test('DELETE /:id removes the caller\'s entry; another user\'s is 404 and kept', async () => {
    const bobsEntry = await JournalEntry.query().insert({ user_id: bob.id, text: 'keep', entry_date: new Date() });
    assert.equal((await request(app).delete(`/api/journal/${bobsEntry.id}`).set('Cookie', [aliceCookie])).status, 404);
    assert.ok(await JournalEntry.query().findById(bobsEntry.id));

    assert.equal((await request(app).delete(`/api/journal/${entryId}`).set('Cookie', [aliceCookie])).status, 200);
    assert.equal(await JournalEntry.query().findById(entryId), undefined);
  });
});
