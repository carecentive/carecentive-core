/**
 * Contract test for routes/files.js (multipart upload). Covers auth, the
 * type/extension/mime gate, and — on success — that the row lands in
 * `user_files` AND the file is written into PROJECT_PATH/uploads.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { initTestDb, destroyTestDb, buildTestApp, createUser, authCookie } = require('../../testing');
const filesRouter = require('../../routes/files');
const File = require('../../models/File');

const PNG_BYTES = Buffer.from('89504e470d0a1a0a', 'hex'); // PNG magic number, enough for this route

test('routes/files', async (t) => {
  const knex = await initTestDb();
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-files-'));
  fs.mkdirSync(path.join(projectPath, 'uploads'));
  const previousProjectPath = process.env.PROJECT_PATH;
  process.env.PROJECT_PATH = projectPath;

  t.after(async () => {
    await destroyTestDb(knex);
    process.env.PROJECT_PATH = previousProjectPath;
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  const app = buildTestApp([{ path: '/api/files', router: filesRouter }]);
  const user = await createUser({ name: 'files-user' });
  const cookie = authCookie(user);

  await t.test('POST / without a token is rejected with 401', async () => {
    const res = await request(app)
      .post('/api/files')
      .field('type', 'labresult')
      .attach('data', PNG_BYTES, { filename: 'scan.png', contentType: 'image/png' });
    assert.equal(res.status, 401);
  });

  await t.test('POST / without a type field is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Cookie', [cookie])
      .attach('data', PNG_BYTES, { filename: 'scan.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
  });

  await t.test('POST / with a disallowed file type is rejected with 415', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Cookie', [cookie])
      .field('type', 'labresult')
      .attach('data', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    assert.equal(res.status, 415);
  });

  await t.test('POST / stores the file and a user_files row', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Cookie', [cookie])
      .field('type', 'labresult')
      .attach('data', PNG_BYTES, { filename: 'scan.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.fileId, 'number');

    const row = await File.query().findById(res.body.fileId);
    assert.ok(row);
    assert.equal(row.user_id, user.id);
    assert.equal(row.type, 'labresult');
    assert.ok(row.fileref.endsWith('.unsafe'));

    assert.ok(
      fs.existsSync(path.join(projectPath, 'uploads', row.fileref)),
      'uploaded file is on disk'
    );
  });
});
