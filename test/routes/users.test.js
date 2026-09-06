/**
 * Contract test for core's public HTTP surface: routes/users.js.
 *
 * Routes are what core exports and what every downstream app mounts verbatim,
 * so this is the primary altitude for core's own suite. For write endpoints it
 * asserts BOTH halves of the contract: the HTTP response AND the resulting row
 * in the database (a 200 alone can't tell "created" from "silently skipped").
 * Service internals get their own, thinner tests in ../services.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { initTestDb, destroyTestDb, buildTestApp } = require('../../testing');
const usersRouter = require('../../routes/users');
const User = require('../../models/User');

/** Pull the `token` cookie out of a Set-Cookie header. */
function tokenCookie(res) {
  const cookies = res.headers['set-cookie'] || [];
  const raw = cookies.find((c) => c.startsWith('token='));
  assert.ok(raw, 'response set a token cookie');
  return { raw, pair: raw.split(';')[0], value: raw.split(';')[0].slice('token='.length) };
}

test('routes/users', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const app = buildTestApp([{ path: '/api/users', router: usersRouter }]);

  await t.test('POST /register creates the account row', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'alice', email: 'alice@example.com', password: 'hunter2' });
    assert.equal(res.status, 200);

    const row = await User.query().findOne({ name: 'alice' });
    assert.ok(row, 'user row exists');
    assert.equal(row.email, 'alice@example.com');
    assert.notEqual(row.password_hash, 'hunter2', 'password is not stored in clear');
    assert.ok(row.password_hash.startsWith('$2'), 'password is bcrypt-hashed');
  });

  await t.test('POST /register masks a duplicate: 200, but no second row and no overwrite', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'alice', email: 'attacker@example.com', password: 'whatever' });
    assert.equal(res.status, 200);

    const rows = await User.query().where({ name: 'alice' });
    assert.equal(rows.length, 1, 'still exactly one alice');
    assert.equal(rows[0].email, 'alice@example.com', 'original row was not modified');
  });

  await t.test('POST /register rejects a missing field with 400 and writes nothing', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'bob', email: 'bob@example.com' });
    assert.equal(res.status, 400);

    const row = await User.query().findOne({ name: 'bob' });
    assert.equal(row, undefined, 'no partial user row');
  });

  await t.test('POST /login rejects bad credentials with 401', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'alice', password: 'wrong' });
    assert.equal(res.status, 401);
  });

  let session;

  await t.test('POST /login returns a token and a hardened auth cookie', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'alice', password: 'hunter2' });

    assert.equal(res.status, 200);

    const { raw, pair, value } = tokenCookie(res);
    assert.match(raw, /HttpOnly/i);
    assert.match(raw, /SameSite=Lax/i);
    assert.match(raw, /Path=\//i);
    assert.doesNotMatch(raw, /Secure/i, 'not Secure outside production');

    const decoded = jwt.verify(value, process.env.JWT_TOKEN_SECRET);
    assert.equal(decoded.name, 'alice');

    session = pair;
  });

  await t.test('POST /changePassword requires auth and leaves the hash untouched', async () => {
    const before = await User.query().findOne({ name: 'alice' });

    const res = await request(app)
      .post('/api/users/changePassword')
      .send({ newPassword: 'irrelevant' });
    assert.equal(res.status, 401);

    const after = await User.query().findOne({ name: 'alice' });
    assert.equal(after.password_hash, before.password_hash, 'hash unchanged');
  });

  await t.test('POST /changePassword with a valid cookie persists the new hash', async () => {
    const before = await User.query().findOne({ name: 'alice' });

    const change = await request(app)
      .post('/api/users/changePassword')
      .set('Cookie', [session])
      .send({ newPassword: 'new-passphrase' });
    assert.equal(change.status, 200);

    const after = await User.query().findOne({ name: 'alice' });
    assert.notEqual(after.password_hash, before.password_hash, 'hash was replaced');
    assert.ok(after.password_hash.startsWith('$2'));

    const relogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'alice', password: 'new-passphrase' });
    assert.equal(relogin.status, 200);
  });
});
