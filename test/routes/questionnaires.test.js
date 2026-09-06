/**
 * Contract test for routes/questionnaires.js. Covers create/read/delete, input
 * validation, and — importantly — that one user cannot delete or probe another
 * user's questionnaires (both cases must look identical: 404).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, destroyTestDb, buildTestApp, createUser, authCookie } = require('../../testing');
const questionnairesRouter = require('../../routes/questionnaires');
const Questionnaire = require('../../models/Questionnaire');

test('routes/questionnaires', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/questionnaires', router: questionnairesRouter }]);
  const alice = await createUser({ name: 'alice-q' });
  const bob = await createUser({ name: 'bob-q' });
  const aliceCookie = authCookie(alice);

  await t.test('POST / stores a questionnaire for the caller', async () => {
    const res = await request(app)
      .post('/api/questionnaires')
      .set('Cookie', [aliceCookie])
      .send({ questionnaireName: 'phq9', questionnaireData: { score: 12 }, questionnaireMeta: { v: 1 } });
    assert.equal(res.status, 200);

    const rows = await Questionnaire.query().where({ user_id: alice.id, questionnaire: 'phq9' });
    assert.equal(rows.length, 1);
    assert.deepEqual(JSON.parse(rows[0].data), { score: 12 });
  });

  await t.test('POST / rejects missing name or data with 400', async () => {
    assert.equal(
      (await request(app).post('/api/questionnaires').set('Cookie', [aliceCookie]).send({ questionnaireData: { a: 1 } })).status,
      400
    );
    assert.equal(
      (await request(app).post('/api/questionnaires').set('Cookie', [aliceCookie]).send({ questionnaireName: 'x' })).status,
      400
    );
  });

  await t.test('GET / requires the questionnaire query param', async () => {
    assert.equal((await request(app).get('/api/questionnaires').set('Cookie', [aliceCookie])).status, 400);
  });

  await t.test('GET /?questionnaire= returns only the caller\'s matching rows', async () => {
    const res = await request(app)
      .get('/api/questionnaires?questionnaire=phq9')
      .set('Cookie', [aliceCookie]);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].user_id, alice.id);
  });

  await t.test('DELETE /:id of another user\'s row is 404 and leaves it intact', async () => {
    const bobsRow = await Questionnaire.query().insert({
      user_id: bob.id,
      datetime: new Date(),
      questionnaire: 'gad7',
      data: '{}',
      meta: '{}',
    });

    const res = await request(app)
      .delete(`/api/questionnaires/${bobsRow.id}`)
      .set('Cookie', [aliceCookie]);
    assert.equal(res.status, 404);

    assert.ok(await Questionnaire.query().findById(bobsRow.id), 'bob\'s row still there');
  });

  await t.test('DELETE /:id of the caller\'s own row removes it', async () => {
    const row = await Questionnaire.query().findOne({ user_id: alice.id, questionnaire: 'phq9' });

    const res = await request(app)
      .delete(`/api/questionnaires/${row.id}`)
      .set('Cookie', [aliceCookie]);
    assert.equal(res.status, 200);

    assert.equal(await Questionnaire.query().findById(row.id), undefined);
  });
});
