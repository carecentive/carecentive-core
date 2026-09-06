/**
 * Contract test for routes/analytics.js — a public (optionally authenticated)
 * write endpoint. Asserts the HTTP response AND the persisted `analytics` row.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, destroyTestDb, buildTestApp, createUser, authCookie } = require('../../testing');
const analyticsRouter = require('../../routes/analytics');
const Analytics = require('../../models/Analytics');

test('routes/analytics', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/analytics', router: analyticsRouter }]);

  await t.test('POST / without a type is rejected with 400 and stores nothing', async () => {
    const res = await request(app).post('/api/analytics').send({ name: 'no-type' });
    assert.equal(res.status, 400);
    assert.equal(await Analytics.query().resultSize(), 0);
  });

  await t.test('POST / stores an anonymous event (no user_id)', async () => {
    const res = await request(app)
      .post('/api/analytics')
      .send({ type: 'page_view', name: 'home', details: { path: '/' } });
    assert.equal(res.status, 200);

    const row = await Analytics.query().findOne({ type: 'page_view' });
    assert.ok(row);
    assert.equal(row.user_id, null);
    assert.equal(row.name, 'home');
    assert.deepEqual(JSON.parse(row.details), { path: '/' });
  });

  await t.test('POST / attributes the event to the caller when a token is sent', async () => {
    const user = await createUser({ name: 'analytics-user' });

    const res = await request(app)
      .post('/api/analytics')
      .set('Cookie', [authCookie(user)])
      .send({ type: 'click', name: 'cta' });
    assert.equal(res.status, 200);

    const row = await Analytics.query().findOne({ type: 'click' });
    assert.equal(row.user_id, user.id);
  });
});
