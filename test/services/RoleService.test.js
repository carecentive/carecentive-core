/**
 * Service-level tests for RoleService.
 *
 * The roles/permissions system has no HTTP route of its own (Authentication
 * .authenticateAdmin and app code consume it directly), so the service is the
 * surface to test.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { initTestDb, destroyTestDb } = require('../../testing');
const RoleService = require('../../services/RoleService');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');

test('RoleService', async (t) => {
  const knex = await initTestDb();
  t.after(() => destroyTestDb(knex));

  const admin = await Role.query().insert({ name: 'admin' });
  const read = await Permission.query().insert({ name: 'users.read' });
  const write = await Permission.query().insert({ name: 'users.write' });
  await Role.relatedQuery('permissions').for(admin.id).relate(read.id);

  await t.test('getByIdOrName resolves by name and by numeric id', async () => {
    assert.equal((await RoleService.getByIdOrName('admin')).id, admin.id);
    assert.equal((await RoleService.getByIdOrName(admin.id)).name, 'admin');
  });

  await t.test('getByIdOrName returns undefined for an unknown name, false for a bad type', async () => {
    assert.equal(await RoleService.getByIdOrName('nope'), undefined);
    assert.equal(await RoleService.getByIdOrName(true), false);
  });

  await t.test('getPermissions lists the permissions related to a role', async () => {
    const perms = await RoleService.getPermissions('admin');
    assert.deepEqual(perms.map((p) => p.name), ['users.read']);
  });

  await t.test('hasPermission reflects the role_permissions link', async () => {
    assert.equal(await RoleService.hasPermission('admin', 'users.read'), true);
    assert.equal(await RoleService.hasPermission('admin', 'users.write'), false);
    assert.equal(await RoleService.hasPermission('admin', 'does.not.exist'), false);
    assert.equal(await RoleService.hasPermission('ghost-role', 'users.read'), false);
  });
});
