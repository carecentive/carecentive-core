/**
 * Service-level tests for PermissionService — a thin lookup with no route.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { initTestDb, destroyTestDb } = require('../../testing');
const PermissionService = require('../../services/PermissionService');
const Permission = require('../../models/Permission');

test('PermissionService', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const perm = await Permission.query().insert({ name: 'measurements.read' });

  await t.test('getByIdOrName resolves by name', async () => {
    assert.equal((await PermissionService.getByIdOrName('measurements.read')).id, perm.id);
  });

  await t.test('getByIdOrName resolves by numeric id', async () => {
    assert.equal((await PermissionService.getByIdOrName(perm.id)).name, 'measurements.read');
  });

  await t.test('getByIdOrName returns undefined for unknown, false for a bad type', async () => {
    assert.equal(await PermissionService.getByIdOrName('nope'), undefined);
    assert.equal(await PermissionService.getByIdOrName(null), false);
  });
});
