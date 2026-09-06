/**
 * Contract test for routes/settings.js. Covers auth enforcement, validation,
 * the create-vs-update branch in SettingsService, and read-back.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, destroyTestDb, buildTestApp, createUser, authCookie } = require('../../testing');
const settingsRouter = require('../../routes/settings');
const Setting = require('../../models/Setting');

test('routes/settings', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/settings', router: settingsRouter }]);
  const user = await createUser({ name: 'settings-user' });
  const cookie = authCookie(user);

  await t.test('GET / without a token is rejected with 401', async () => {
    const res = await request(app).get('/api/settings');
    assert.equal(res.status, 401);
  });

  await t.test('POST / with a missing field is rejected with 400', async () => {
    assert.equal((await request(app).post('/api/settings').set('Cookie', [cookie]).send({ key: 'x' })).status, 400);
    assert.equal((await request(app).post('/api/settings').set('Cookie', [cookie]).send({ data: 'y' })).status, 400);
  });

  await t.test('POST / creates a setting row', async () => {
    const res = await request(app)
      .post('/api/settings')
      .set('Cookie', [cookie])
      .send({ key: 'theme', data: 'dark' });
    assert.equal(res.status, 200);

    const rows = await Setting.query().where({ user_id: user.id, key: 'theme' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data, 'dark');
  });

  await t.test('POST / on an existing key updates in place (no duplicate row)', async () => {
    const res = await request(app)
      .post('/api/settings')
      .set('Cookie', [cookie])
      .send({ key: 'theme', data: 'light' });
    assert.equal(res.status, 200);

    const rows = await Setting.query().where({ user_id: user.id, key: 'theme' });
    assert.equal(rows.length, 1, 'still one row');
    assert.equal(rows[0].data, 'light');
  });

  await t.test('GET / returns the caller\'s settings', async () => {
    const res = await request(app).get('/api/settings').set('Cookie', [cookie]);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].key, 'theme');
  });

  await t.test('GET /:key returns just that value', async () => {
    const res = await request(app).get('/api/settings/theme').set('Cookie', [cookie]);
    assert.equal(res.status, 200);
    assert.equal(res.text, JSON.stringify('light'));
  });
});
