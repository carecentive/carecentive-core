/**
 * Service-level tests for UserService.
 *
 * Route tests (../routes/users.test.js) are the primary altitude. Drop to the
 * service here only for logic the HTTP layer hides or cannot reach:
 *   - behaviour a route deliberately masks (duplicate registration -> 200)
 *   - that two different inputs share a single error path (login enumeration
 *     mitigation): over HTTP both are just "401", here we can see it is one path
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { initTestDb, destroyTestDb } = require('../../testing');
const UserService = require('../../services/UserService');
const User = require('../../models/User');

test('UserService', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  await UserService.register('bob', 'bob@example.com', 'hunter2');

  await t.test('register throws USER_ALREADY_EXISTS on a duplicate name', async () => {
    await assert.rejects(
      () => UserService.register('bob', 'bob-2@example.com', 'whatever'),
      /USER_ALREADY_EXISTS/
    );
  });

  await t.test('login uses one error for "no such user" and "wrong password"', async () => {
    await assert.rejects(() => UserService.login('bob', 'wrong'), /INVALID_NAME_OR_PASSWORD/);
    await assert.rejects(() => UserService.login('ghost', 'whatever'), /INVALID_NAME_OR_PASSWORD/);
  });

  await t.test('changePassword replaces the stored hash', async () => {
    const before = await User.query().findOne({ name: 'bob' });

    await UserService.changePassword(before.id, 'a-new-password');

    const after = await User.query().findOne({ name: 'bob' });
    assert.notEqual(after.password_hash, before.password_hash);

    const token = await UserService.login('bob', 'a-new-password');
    assert.ok(token, 'can log in with the new password');
  });
});
