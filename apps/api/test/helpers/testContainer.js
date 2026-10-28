import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { uploadObjectKey } from '../../src/application/uploads/objectKeys.js';
import { buildContainer } from '../../src/bootstrap/container.js';
import { loadConfig } from '../../src/config/env.js';
import { createFixedClock } from '../../src/lib/clock.js';
import { buildJpeg, cameraTiff, GPS_XMP } from './images.js';

export const START = '2026-01-15T12:00:00.000Z';

/**
 * Memory adapters, a controllable clock, a fast bcrypt cost, a temp folder
 * for local storage and a mailer that keeps messages in memory.
 */
export async function createTestContainer({ now = START } = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'flash-test-'));
  const config = loadConfig({ BCRYPT_COST: '4', LOCAL_DATA_DIR: dataDir });
  const clock = createFixedClock(now);
  const sentEmails = [];
  const mailer = {
    async send(message) {
      sentEmails.push(message);
    },
  };
  const logger = { info() {}, warn() {}, error() {} };

  const container = buildContainer(config, { clock, mailer, logger });
  return {
    ...container,
    clock,
    sentEmails,
    cleanup: () => rm(dataDir, { recursive: true, force: true }),
  };
}

let counter = 0;

/** Registers a user and returns the viewer object the HTTP layer would build. */
export async function signUp(container, overrides = {}) {
  counter += 1;
  const input = {
    email: `person${counter}@example.com`,
    username: `person_${counter}`,
    birthDate: '1995-06-01',
    password: 'correct horse battery',
    ...overrides,
  };
  const session = await container.useCases.register(input);
  const viewer = await container.useCases.authenticate(session.token);
  return { input, session, viewer };
}

/** Simulates the browser upload: presigned target, then the file lands in storage. */
export async function uploadImage(
  container,
  viewer,
  { body = defaultPhoto(), contentType = 'image/jpeg' } = {},
) {
  const upload = await container.useCases.createUpload({ viewer, contentType, size: body.length });
  await container.storage.putObject(uploadObjectKey(viewer.id, upload.uploadId), body, contentType);
  return upload;
}

export async function publish(container, viewer, details = {}) {
  const upload = await uploadImage(container, viewer, details);
  const { post } = await container.useCases.createPost({
    viewer,
    uploadId: upload.uploadId,
    ...details,
  });
  return post;
}

export function defaultPhoto() {
  return buildJpeg({ tiff: cameraTiff(), xmp: GPS_XMP, comment: 'shot at 40.4N 3.7W' });
}
