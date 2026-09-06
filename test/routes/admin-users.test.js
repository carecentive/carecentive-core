/**
 * Contract test for routes/admin/users.js. The point of interest is the
 * two-stage guard [authenticateToken, authenticateAdmin]: unauthenticated -> 401,
 * authenticated-but-not-admin -> 403, admin -> through.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const {
  initTestDb, destroyTestDb, buildTestApp, createUser, grantRole, authCookie,
} = require('../../testing');
const adminUsersRouter = require('../../routes/admin/users');
const User = require('../../models/User');

test('routes/admin/users', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/admin/users', router: adminUsersRouter }]);

  const admin = await createUser({ name: 'admin' });
  await grantRole(admin.id, 'admin');
  const adminCookie = authCookie(admin);

  const plainUser = await createUser({ name: 'plain' });
  const plainCookie = authCookie(plainUser);

  await t.test('GET / is 401 without a token', async () => {
    assert.equal((await request(app).get('/api/admin/users')).status, 401);
  });

  await t.test('GET / is 403 for a non-admin', async () => {
    assert.equal((await request(app).get('/api/admin/users').set('Cookie', [plainCookie])).status, 403);
  });

  await t.test('GET / lists users with their roles for an admin', async () => {
    const res = await request(app).get('/api/admin/users').set('Cookie', [adminCookie]);
    assert.equal(res.status, 200);

    const adminRow = res.body.find((u) => u.name === 'admin');
    assert.ok(adminRow);
    assert.ok('created_at' in adminRow);
    assert.deepEqual(adminRow.roles.map((r) => r.name), ['admin']);
    assert.equal(res.body.find((u) => u.name === 'plain').roles.length, 0);
  });

  await t.test('POST /:userId/changePassword is 403 for a non-admin', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${plainUser.id}/changePassword`)
      .set('Cookie', [plainCookie])
      .send({ newPassword: 'x' });
    assert.equal(res.status, 403);
  });

  await t.test('POST /:userId/changePassword needs a newPassword', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${plainUser.id}/changePassword`)
      .set('Cookie', [adminCookie])
      .send({});
    assert.equal(res.status, 400);
  });

  await t.test('POST /:userId/changePassword updates the target user\'s hash', async () => {
    const before = await User.query().findById(plainUser.id);

    const res = await request(app)
      .post(`/api/admin/users/${plainUser.id}/changePassword`)
      .set('Cookie', [adminCookie])
      .send({ newPassword: 'reset-by-admin' });
    assert.equal(res.status, 200);

    const after = await User.query().findById(plainUser.id);
    assert.notEqual(after.password_hash, before.password_hash);
    assert.ok(await bcrypt.compare('reset-by-admin', after.password_hash));
  });
});
