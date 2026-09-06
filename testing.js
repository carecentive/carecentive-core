/**
 * Test-support toolkit for applications built on carecentive-core
 * (carecentive-framework and its derivatives).
 *
 * This is NOT core's own test suite. It is a public, supported entry point that
 * downstream apps import to stand up an isolated database and a minimal Express
 * app for their own tests:
 *
 *   const {
 *     initTestDb, destroyTestDb, buildTestApp, signToken,
 *   } = require('@carecentive/carecentive-core/testing');
 *
 * Only reusable plumbing lives here. App-specific wiring (which extra migration
 * directories to run, model fixtures, ...) stays in the consuming app, normally
 * as a thin wrapper around this module.
 *
 * Requires `sqlite3` to be resolvable at test time. carecentive-framework ships
 * it as a dependency; core keeps it as a devDependency for its own tests.
 */
'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const knexFactory = require('knex');

const { init: initORM } = require('./models/ORM');
const User = require('./models/User');
const Role = require('./models/Role');

/** Absolute path to core's own migration directory. */
const CORE_MIGRATIONS_DIR = path.join(__dirname, 'database', 'migrations');

/**
 * Apply sensible defaults for a hermetic test run. Values already present in the
 * environment win, so CI can still override them. Safe to call repeatedly.
 */
function applyTestEnvDefaults() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_TOKEN_SECRET =
    process.env.JWT_TOKEN_SECRET || 'test-secret-not-for-production';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
}

/**
 * Create a migrated in-memory database and bind it to core's Objection ORM.
 * Each call returns a fresh, isolated database.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.extraMigrationDirs]
 *   Extra migration directories (e.g. the host app's own `database/migrations`),
 *   run alongside core's.
 * @param {import('knex').Knex.Config} [opts.knexConfig]
 *   Override the default `sqlite3` / `:memory:` connection. The migrations
 *   directory is always injected, so leave `migrations` out.
 * @returns {Promise<import('knex').Knex>} the knex instance; pass to destroyTestDb().
 */
async function initTestDb({ extraMigrationDirs = [], knexConfig } = {}) {
  applyTestEnvDefaults();

  const config = knexConfig
    ? { ...knexConfig }
    : {
        client: 'sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
      };

  config.migrations = {
    ...(config.migrations || {}),
    directory: [CORE_MIGRATIONS_DIR, ...extraMigrationDirs],
  };

  const knex = knexFactory(config);
  await knex.migrate.latest();
  initORM(knex);

  return knex;
}

/**
 * Tear down a database created by initTestDb().
 * @param {import('knex').Knex} knex
 */
async function destroyTestDb(knex) {
  if (knex) {
    await knex.destroy();
  }
}

/**
 * Build a minimal Express app: JSON + cookie parsing, the given routers, and a
 * JSON error handler. Deliberately avoids the host app's bootstrap so tests
 * don't pick up cron jobs, logger setup or static file serving.
 *
 * @param {{ path: string, router: import('express').Router }[]} [mounts]
 * @returns {import('express').Express}
 */
function buildTestApp(mounts = []) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  for (const { path: mountPath, router } of mounts) {
    app.use(mountPath, router);
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

/**
 * Sign a JWT the way UserService.login does, so it satisfies
 * Authentication.authenticateToken. Send it as a `token` cookie:
 *
 *   .set('Cookie', [`token=${signToken({ user_id, name })}`])
 *
 * @param {object} payload e.g. { user_id, name }
 */
function signToken(payload) {
  applyTestEnvDefaults();
  return jwt.sign(payload, process.env.JWT_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
}

/**
 * Insert a user row directly (bypassing the register route). The password is
 * hashed at a deliberately low bcrypt cost — fast, and irrelevant when the
 * session cookie is forged with authCookie() rather than obtained via /login.
 *
 * @param {object} [attrs]
 * @param {string} [attrs.name]
 * @param {string} [attrs.email]
 * @param {string} [attrs.password]
 * @returns {Promise<import('objection').Model & { id: number }>}
 */
async function createUser({ name = 'test-user', email, password = 'password' } = {}) {
  return User.query().insert({
    name,
    email: email || `${name}@example.com`,
    password_hash: await bcrypt.hash(password, 4),
  });
}

/**
 * Give a user a role, creating the role row if needed. Used to exercise
 * admin-only endpoints (Authentication.authenticateAdmin looks for role 'admin').
 *
 * @param {number} userId
 * @param {string} roleName
 */
async function grantRole(userId, roleName) {
  let role = await Role.query().findOne({ name: roleName });
  if (!role) {
    role = await Role.query().insert({ name: roleName });
  }
  await User.relatedQuery('roles').for(userId).relate(role.id);
  return role;
}

/**
 * A `token=<jwt>` cookie pair for a user, for supertest:
 *   .set('Cookie', [authCookie(user)])
 *
 * @param {{ id: number, name: string }} user
 */
function authCookie(user) {
  return `token=${signToken({ user_id: user.id, name: user.name })}`;
}

module.exports = {
  CORE_MIGRATIONS_DIR,
  applyTestEnvDefaults,
  initTestDb,
  destroyTestDb,
  buildTestApp,
  signToken,
  createUser,
  grantRole,
  authCookie,
};
