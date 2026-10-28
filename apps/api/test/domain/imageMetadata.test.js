import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crc32 } from 'node:zlib';
import { sanitizeExif } from '../../src/domain/exif/sanitize.js';
import {
  assertImageFile,
  detectImageFormat,
  validateUploadRequest,
} from '../../src/domain/images/formats.js';
import {
  hasGpsMetadata,
  readImageMetadata,
  stripImageMetadata,
} from '../../src/domain/images/metadata.js';
import { AppError } from '../../src/lib/errors.js';
import {
  GPS_XMP,
  SCAN_DATA,
  buildJpeg,
  buildPng,
  cameraTiff,
  pngChunkTypes,
} from '../helpers/images.js';

const contains = (buffer, text) => buffer.includes(Buffer.from(text, 'latin1'));

describe('readImageMetadata', () => {
  for (const little of [true, false]) {
    it(`extracts camera EXIF from a JPEG (${little ? 'little' : 'big'} endian)`, () => {
      const jpeg = buildJpeg({ tiff: cameraTiff({ little }) });
      const { exif, gpsFound, orientation } = readImageMetadata(jpeg, 'jpeg');

      assert.deepEqual(exif, {
        cameraMake: 'FUJIFILM',
        cameraModel: 'X-T5',
        lens: 'XF23mmF1.4 R LM WR',
        focalLength: '23mm',
        aperture: 'f/1.8',
        shutterSpeed: '1/250s',
        iso: '400',
        exposureBias: '-0.3 EV',
        meteringMode: 'Pattern',
        flash: 'Did not fire',
        dateTaken: '2026-03-14 09:26:53',
      });
      assert.equal(gpsFound, true);
      assert.equal(orientation, 6);
    });
  }

  it('never exposes GPS values in the extracted EXIF', () => {
    const { exif } = readImageMetadata(buildJpeg({ tiff: cameraTiff() }), 'jpeg');
    assert.ok(Object.keys(exif).every((key) => !/gps|lat|lon/i.test(key)));
  });

  it('detects GPS that only appears in XMP', () => {
    const jpeg = buildJpeg({ tiff: cameraTiff({ withGps: false }), xmp: GPS_XMP });
    assert.equal(readImageMetadata(jpeg, 'jpeg').gpsFound, true);
  });

  it('works without any metadata', () => {
    assert.deepEqual(readImageMetadata(buildJpeg(), 'jpeg'), {
      exif: {},
      gpsFound: false,
      orientation: 1,
    });
  });

  it('reads EXIF from a PNG eXIf chunk', () => {
    const { exif, gpsFound } = readImageMetadata(buildPng({ tiff: cameraTiff() }), 'png');
    assert.equal(exif.cameraModel, 'X-T5');
    assert.equal(gpsFound, true);
  });
});

describe('stripImageMetadata (GPS removal)', () => {
  it('removes EXIF, GPS, XMP, IPTC, comments and trailing data from a JPEG', () => {
    const embedded = buildJpeg({ tiff: cameraTiff() });
    const original = buildJpeg({
      tiff: cameraTiff(),
      xmp: GPS_XMP,
      comment: 'home',
      trailing: embedded,
    });
    assert.equal(hasGpsMetadata(original, 'jpeg'), true);

    const clean = stripImageMetadata(original, 'jpeg', { orientation: 6 });

    assert.equal(hasGpsMetadata(clean, 'jpeg'), false);
    assert.equal(contains(clean, 'GPSLatitude'), false);
    assert.equal(contains(clean, 'FUJIFILM'), false);
    assert.equal(contains(clean, 'IPTC city'), false);
    assert.equal(contains(clean, 'home'), false);
    assert.ok(clean.includes(SCAN_DATA), 'image data is preserved byte for byte');
    assert.deepEqual([...clean.subarray(-2)], [0xff, 0xd9], 'ends at the main image EOI');
    assert.equal(clean.indexOf(Buffer.from([0xff, 0xd9])), clean.length - 2, 'no appended image');
  });

  it('keeps the orientation so phone photos stay upright', () => {
    const clean = stripImageMetadata(buildJpeg({ tiff: cameraTiff() }), 'jpeg', { orientation: 6 });
    assert.deepEqual(readImageMetadata(clean, 'jpeg'), {
      exif: {},
      gpsFound: false,
      orientation: 6,
    });
  });

  it('writes no EXIF block at all for upright photos', () => {
    const clean = stripImageMetadata(buildJpeg({ tiff: cameraTiff() }), 'jpeg', { orientation: 1 });
    assert.equal(contains(clean, 'Exif'), false);
  });

  it('keeps rendering data such as JFIF and ICC profiles', () => {
    const clean = stripImageMetadata(buildJpeg({ tiff: cameraTiff(), icc: true }), 'jpeg');
    assert.ok(contains(clean, 'JFIF'));
    assert.ok(contains(clean, 'ICC_PROFILE'));
  });

  it('removes eXIf, XMP, text chunks and trailing data from a PNG', () => {
    const original = buildPng({ tiff: cameraTiff(), xmp: GPS_XMP, trailing: Buffer.from('extra') });
    const clean = stripImageMetadata(original, 'png', { orientation: 6 });

    assert.deepEqual(pngChunkTypes(clean), ['IHDR', 'sRGB', 'eXIf', 'IDAT', 'IEND']);
    assert.equal(hasGpsMetadata(clean, 'png'), false);
    assert.equal(readImageMetadata(clean, 'png').orientation, 6);
    assert.equal(contains(clean, 'taken at home'), false);
    assert.equal(contains(clean, 'extra'), false);

    // The new eXIf chunk has a valid CRC.
    const start = clean.indexOf(Buffer.from('eXIf'));
    const length = clean.readUInt32BE(start - 4);
    const crc = clean.readUInt32BE(start + 4 + length);
    assert.equal(crc, crc32(clean.subarray(start, start + 4 + length)));
  });

  it('rejects corrupt files', () => {
    const truncated = buildJpeg({ tiff: cameraTiff() }).subarray(0, 30);
    assert.throws(
      () => stripImageMetadata(truncated, 'jpeg'),
      (error) => error.status === 415,
    );
  });
});

describe('sanitizeExif (manual edits)', () => {
  it('drops every non-whitelisted field, GPS included', () => {
    const exif = sanitizeExif({
      cameraMake: '  Leica ',
      gpsLatitude: '40.4168',
      GPSLongitude: '-3.7038',
      location: 'Madrid',
    });
    assert.deepEqual(exif, { cameraMake: 'Leica' });
  });

  it('rejects location typed into an allowed field', () => {
    assert.throws(
      () => sanitizeExif({ lens: '40° 25\' 12" N' }),
      (error) => error.status === 400 && 'exif.lens' in error.fields,
    );
  });

  it('rejects values that are too long or not text', () => {
    assert.throws(
      () => sanitizeExif({ iso: '1'.repeat(20) }),
      (error) => 'exif.iso' in error.fields,
    );
    assert.throws(
      () => sanitizeExif({ iso: { value: 1 } }),
      (error) => 'exif.iso' in error.fields,
    );
    assert.throws(
      () => sanitizeExif('not an object'),
      (error) => 'exif' in error.fields,
    );
  });

  it('accepts an empty edit (the author cleared everything)', () => {
    assert.deepEqual(sanitizeExif({}), {});
    assert.deepEqual(sanitizeExif({ cameraMake: '   ' }), {});
  });
});

describe('image validation', () => {
  it('detects the format from magic bytes', () => {
    assert.equal(detectImageFormat(buildJpeg()), 'jpeg');
    assert.equal(detectImageFormat(buildPng()), 'png');
    assert.equal(detectImageFormat(Buffer.from('GIF89a')), null);
  });

  it('rejects files that are not JPEG or PNG', () => {
    assert.throws(
      () => assertImageFile(Buffer.from('<svg></svg>')),
      (error) => error.status === 415,
    );
  });

  it('rejects a PNG declared as JPEG', () => {
    assert.throws(
      () => assertImageFile(buildPng(), 'image/jpeg'),
      (error) => error.status === 415,
    );
  });

  it('validates the declared upload', () => {
    assert.deepEqual(validateUploadRequest({ contentType: 'image/png', size: 10 }), {
      contentType: 'image/png',
      size: 10,
    });
    assert.throws(
      () => validateUploadRequest({ contentType: 'image/gif', size: 10 }),
      (e) => e.status === 415,
    );
    assert.throws(
      () => validateUploadRequest({ contentType: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }),
      (error) => error instanceof AppError && error.status === 413,
    );
    assert.throws(
      () => validateUploadRequest({ contentType: 'image/jpeg', size: 0 }),
      (e) => e.status === 400,
    );
  });
});
