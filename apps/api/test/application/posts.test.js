import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { FEED_PAGE_SIZE } from '@flash/shared';
import { postObjectKey, uploadObjectKey } from '../../src/application/uploads/objectKeys.js';
import { hasGpsMetadata, readImageMetadata } from '../../src/domain/images/metadata.js';
import { buildJpeg, buildPng, cameraTiff, GPS_XMP } from '../helpers/images.js';
import { createTestContainer, publish, signUp, uploadImage } from '../helpers/testContainer.js';

describe('posts', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  it('extracts EXIF from the upload and reports removed GPS before publishing', async () => {
    const { viewer } = await signUp(c);
    const upload = await uploadImage(c, viewer);
    const result = await c.useCases.getUploadExif({ viewer, uploadId: upload.uploadId });

    assert.equal(result.gpsRemoved, true);
    assert.equal(result.contentType, 'image/jpeg');
    assert.equal(result.exif.cameraModel, 'X-T5');
    assert.ok(Object.keys(result.exif).every((key) => !/gps|lat|lon/i.test(key)));
  });

  it('stores the published image without GPS or other metadata', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer);

    const key = postObjectKey(post.id, 'jpg');
    const stored = await c.storage.getObject(key, { maxBytes: Infinity });
    assert.equal(hasGpsMetadata(stored.body, 'jpeg'), false);
    assert.deepEqual(readImageMetadata(stored.body, 'jpeg').exif, {});
    assert.equal(readImageMetadata(stored.body, 'jpeg').orientation, 6);
    assert.equal(post.imageUrl, c.storage.publicUrl(key));
    assert.equal(post.exif.aperture, 'f/1.8');
  });

  it('deletes the raw upload once published', async () => {
    const { viewer } = await signUp(c);
    const upload = await uploadImage(c, viewer);
    await c.useCases.createPost({ viewer, uploadId: upload.uploadId });
    assert.equal(
      await c.storage.getObject(uploadObjectKey(viewer.id, upload.uploadId), {
        maxBytes: Infinity,
      }),
      null,
    );
  });

  it('uses manually edited EXIF instead, always without GPS', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer, {
      exif: { cameraMake: 'Leica', cameraModel: 'M11', gpsLatitude: '40.4', GPSInfo: 'x' },
    });
    assert.deepEqual(post.exif, { cameraMake: 'Leica', cameraModel: 'M11' });
  });

  it('publishes with only the image (description, tags and EXIF are optional)', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer, { body: buildPng(), contentType: 'image/png', exif: {} });
    assert.equal(post.description, null);
    assert.deepEqual(post.tags, []);
    assert.deepEqual(post.exif, {});
    assert.match(post.imageUrl, /\.png$/);
  });

  it('strips GPS from PNG uploads too', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer, {
      body: buildPng({ tiff: cameraTiff(), xmp: GPS_XMP }),
      contentType: 'image/png',
    });
    const stored = await c.storage.getObject(postObjectKey(post.id, 'png'), { maxBytes: Infinity });
    assert.equal(hasGpsMetadata(stored.body, 'png'), false);
  });

  it('rejects files that are not real JPEG or PNG, and wrong declared types', async () => {
    const { viewer } = await signUp(c);
    const fake = await uploadImage(c, viewer, { body: Buffer.from('GIF89a-not-allowed') });
    await assert.rejects(
      c.useCases.createPost({ viewer, uploadId: fake.uploadId }),
      (e) => e.status === 415,
    );

    await assert.rejects(
      c.useCases.createUpload({ viewer, contentType: 'image/gif', size: 100 }),
      (error) => error.status === 415,
    );
    await assert.rejects(
      c.useCases.createUpload({ viewer, contentType: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }),
      (error) => error.status === 413,
    );
  });

  it('rejects stored files over 10 MB even if the declared size was smaller', async () => {
    const { viewer } = await signUp(c);
    const huge = Buffer.concat([buildJpeg(), Buffer.alloc(10 * 1024 * 1024)]);
    const upload = await c.useCases.createUpload({ viewer, contentType: 'image/jpeg', size: 1000 });
    await c.storage.putObject(uploadObjectKey(viewer.id, upload.uploadId), huge, 'image/jpeg');
    await assert.rejects(
      c.useCases.createPost({ viewer, uploadId: upload.uploadId }),
      (e) => e.status === 413,
    );
  });

  it("can not publish someone else's upload", async () => {
    const { viewer: owner } = await signUp(c);
    const { viewer: other } = await signUp(c);
    const upload = await uploadImage(c, owner);
    await assert.rejects(
      c.useCases.createPost({ viewer: other, uploadId: upload.uploadId }),
      (e) => e.status === 400,
    );
    await assert.rejects(
      c.useCases.getUploadExif({ viewer: other, uploadId: upload.uploadId }),
      (e) => e.status === 404,
    );
  });

  it('paginates the feed newest first, 12 per page, with a cursor', async () => {
    const { viewer } = await signUp(c);
    const ids = [];
    for (let index = 0; index < FEED_PAGE_SIZE + 3; index++) {
      c.clock.advance(1000);
      ids.push((await publish(c, viewer, { description: `photo ${index}` })).id);
    }

    const first = await c.useCases.listFeed({});
    assert.equal(first.items.length, FEED_PAGE_SIZE);
    assert.equal(first.items[0].id, ids.at(-1));
    assert.ok(first.nextCursor);

    const second = await c.useCases.listFeed({ cursor: first.nextCursor });
    assert.deepEqual(
      second.items.map((post) => post.id),
      ids.slice(0, 3).reverse(),
    );
    assert.equal(second.nextCursor, null);
  });

  it('rejects forged cursors', async () => {
    await assert.rejects(
      c.useCases.listFeed({ cursor: 'garbage' }),
      (error) => error.status === 400,
    );
  });

  it('hidden posts disappear from the feed, the profile and the detail route', async () => {
    const { viewer, input } = await signUp(c);
    const kept = await publish(c, viewer);
    const hidden = await publish(c, viewer);

    await c.useCases.hidePost({ viewer, postId: hidden.id });

    const feed = await c.useCases.listFeed({});
    const profile = await c.useCases.listUserPosts({ username: input.username });
    assert.deepEqual(
      feed.items.map((post) => post.id),
      [kept.id],
    );
    assert.deepEqual(
      profile.items.map((post) => post.id),
      [kept.id],
    );
    await assert.rejects(
      c.useCases.getPost({ postId: hidden.id }),
      (error) => error.status === 404,
    );
    await assert.rejects(
      c.useCases.listComments({ postId: hidden.id }),
      (error) => error.status === 404,
    );
    await assert.rejects(
      c.useCases.addComment({ viewer, postId: hidden.id, content: 'hi' }),
      (error) => error.status === 404,
    );
    await assert.rejects(
      c.useCases.setReaction({ viewer, postId: hidden.id, type: 'like' }),
      (error) => error.status === 404,
    );
  });

  it('only the author can hide a post', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: other } = await signUp(c);
    const post = await publish(c, author);
    await assert.rejects(
      c.useCases.hidePost({ viewer: other, postId: post.id }),
      (error) => error.status === 403,
    );
    assert.ok((await c.useCases.getPost({ postId: post.id })).post);
  });

  it('public post responses never include visibility flags or private user data', async () => {
    const { viewer, input } = await signUp(c);
    const post = await publish(c, viewer);
    const text = JSON.stringify(await c.useCases.getPost({ postId: post.id }));
    assert.ok(!text.includes('visible'));
    assert.ok(!text.includes(input.email));
    assert.ok(!text.includes(input.birthDate));
  });

  it('treats malformed post ids as not found', async () => {
    await assert.rejects(c.useCases.getPost({ postId: '../etc' }), (error) => error.status === 404);
  });
});

describe('local upload emulator', () => {
  it('accepts a valid presigned form and rejects tampering or oversized files', async () => {
    const c = await createTestContainer();
    try {
      const { viewer } = await signUp(c);
      const photo = buildJpeg({ tiff: cameraTiff() });
      const target = await c.useCases.createUpload({
        viewer,
        contentType: 'image/jpeg',
        size: photo.length,
      });

      const form = (fields, file) => {
        const data = new FormData();
        for (const [key, value] of Object.entries(fields)) data.append(key, value);
        data.append('file', new Blob([file]), 'photo.jpg');
        return data;
      };

      assert.equal(
        (await c.storage.receiveUpload(form({ ...target.fields, key: 'uploads/x/y' }, photo)))
          .status,
        403,
      );
      assert.equal(
        (
          await c.storage.receiveUpload(
            form({ ...target.fields, 'Content-Type': 'image/png' }, photo),
          )
        ).status,
        403,
      );
      const tooLarge = await c.storage.receiveUpload(
        form(target.fields, Buffer.alloc(10 * 1024 * 1024 + 1)),
      );
      assert.equal(tooLarge.code, 'EntityTooLarge');

      assert.equal((await c.storage.receiveUpload(form(target.fields, photo))).status, 204);
      const exif = await c.useCases.getUploadExif({ viewer, uploadId: target.uploadId });
      assert.equal(exif.exif.cameraMake, 'FUJIFILM');

      c.clock.advance(11 * 60 * 1000);
      assert.equal((await c.storage.receiveUpload(form(target.fields, photo))).status, 403);
    } finally {
      await c.cleanup();
    }
  });
});
