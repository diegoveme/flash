import { readTiff, buildOrientationTiff, TAGS } from '../exif/tiff.js';
import {
  formatAperture,
  formatDateTaken,
  formatExposureBias,
  formatFlash,
  formatFocalLength,
  formatIso,
  formatMeteringMode,
  formatShutterSpeed,
  formatText,
} from '../exif/format.js';
import { sanitizeExif } from '../exif/sanitize.js';
import {
  JPEG,
  buildExifSegment,
  exifTiff,
  isExifPayload,
  isXmpPayload,
  parseJpeg,
  segmentPayload,
} from './jpeg.js';
import { PNG_SIGNATURE, buildChunk, parsePng } from './png.js';

const XMP_GPS = /GPS(Latitude|Longitude|Altitude|Position)/i;
const TEXT_CHUNKS = new Set(['tEXt', 'iTXt', 'zTXt']);

/**
 * Metadata blocks of an image: TIFF blocks with EXIF and whether XMP text
 * mentions GPS. Shared by extraction and by the post-strip verification.
 */
function collectMetadata(buffer, format) {
  const tiffs = [];
  let xmpHasGps = false;

  if (format === 'jpeg') {
    for (const part of parseJpeg(buffer)) {
      if (part.marker !== JPEG.APP1) continue;
      const payload = segmentPayload(buffer, part);
      if (isExifPayload(payload)) tiffs.push(exifTiff(payload));
      else if (isXmpPayload(payload) && XMP_GPS.test(payload.toString('utf8'))) xmpHasGps = true;
    }
  } else {
    for (const chunk of parsePng(buffer)) {
      if (chunk.type === 'eXIf') tiffs.push(chunk.data);
      else if (TEXT_CHUNKS.has(chunk.type) && XMP_GPS.test(chunk.data.toString('latin1'))) {
        xmpHasGps = true;
      }
    }
  }

  return { tiffs, xmpHasGps };
}

/**
 * Reads the displayable EXIF of a JPEG or PNG. GPS values are never read;
 * `gpsFound` only says that the file carried location data.
 * @param {Buffer} buffer
 * @param {'jpeg' | 'png'} format
 * @returns {{ exif: Record<string, string>, gpsFound: boolean, orientation: number }}
 */
export function readImageMetadata(buffer, format) {
  const { tiffs, xmpHasGps } = collectMetadata(buffer, format);
  const parsed = tiffs.map(readTiff).find(Boolean);

  if (!parsed) {
    return { exif: {}, gpsFound: xmpHasGps, orientation: 1 };
  }

  const { ifd0, exif } = parsed;
  const orientation = ifd0.get(TAGS.ORIENTATION);

  return {
    exif: sanitizeExif(
      {
        cameraMake: formatText(ifd0.get(TAGS.MAKE)),
        cameraModel: formatText(ifd0.get(TAGS.MODEL)),
        lens: formatText(exif.get(TAGS.LENS_MODEL)),
        focalLength: formatFocalLength(exif.get(TAGS.FOCAL_LENGTH)),
        aperture: formatAperture(exif.get(TAGS.F_NUMBER)),
        shutterSpeed: formatShutterSpeed(exif.get(TAGS.EXPOSURE_TIME)),
        iso: formatIso(exif.get(TAGS.ISO)),
        exposureBias: formatExposureBias(exif.get(TAGS.EXPOSURE_BIAS)),
        meteringMode: formatMeteringMode(exif.get(TAGS.METERING_MODE)),
        flash: formatFlash(exif.get(TAGS.FLASH)),
        dateTaken: formatDateTaken(exif.get(TAGS.DATE_TIME_ORIGINAL)),
      },
      { strict: false },
    ),
    gpsFound: xmpHasGps || tiffs.some((tiff) => readTiff(tiff)?.hasGps),
    orientation:
      Number.isInteger(orientation) && orientation >= 1 && orientation <= 8 ? orientation : 1,
  };
}

/**
 * True when the image still has any GPS trace. Used to verify the output
 * of `stripImageMetadata` before anything is stored.
 */
export function hasGpsMetadata(buffer, format) {
  const { tiffs, xmpHasGps } = collectMetadata(buffer, format);
  return xmpHasGps || tiffs.some((tiff) => readTiff(tiff)?.hasGps);
}

// JPEG application segments that only carry rendering data.
function isRenderingSegment(buffer, part) {
  const payload = segmentPayload(buffer, part);
  const startsWith = (text) => payload.toString('latin1', 0, text.length) === text;
  if (part.marker === JPEG.APP0) return startsWith('JFIF\0');
  if (part.marker === JPEG.APP2) return startsWith('ICC_PROFILE\0');
  if (part.marker === JPEG.APP14) return startsWith('Adobe');
  return false;
}

function stripJpeg(buffer, orientation) {
  const output = [];
  let orientationWritten = orientation === 1;

  for (const part of parseJpeg(buffer)) {
    const { marker } = part;
    const isApp = marker !== null && marker >= JPEG.APP0 && marker <= JPEG.APP15;

    if (!orientationWritten && marker !== JPEG.SOI && marker !== JPEG.APP0) {
      output.push(buildExifSegment(buildOrientationTiff(orientation)));
      orientationWritten = true;
    }

    if (marker === JPEG.COM) continue;
    if (isApp && !isRenderingSegment(buffer, part)) continue;
    output.push(buffer.subarray(part.start, part.end));
  }

  const last = output.at(-1);
  if (!(last.length === 2 && last[0] === 0xff && last[1] === JPEG.EOI)) {
    output.push(Buffer.from([0xff, JPEG.EOI]));
  }
  return Buffer.concat(output);
}

// PNG chunks needed to decode and render the image correctly.
const PNG_RENDERING_CHUNKS = new Set([
  'IHDR',
  'PLTE',
  'IDAT',
  'IEND',
  'tRNS',
  'gAMA',
  'cHRM',
  'sRGB',
  'iCCP',
  'sBIT',
  'bKGD',
  'pHYs',
  'cICP',
  'mDCv',
  'cLLi',
  'acTL',
  'fcTL',
  'fdAT',
]);

function stripPng(buffer, orientation) {
  const output = [PNG_SIGNATURE];
  let orientationWritten = orientation === 1;

  for (const chunk of parsePng(buffer)) {
    if (!orientationWritten && chunk.type === 'IDAT') {
      output.push(buildChunk('eXIf', buildOrientationTiff(orientation)));
      orientationWritten = true;
    }
    if (PNG_RENDERING_CHUNKS.has(chunk.type)) {
      output.push(buffer.subarray(chunk.start, chunk.end));
    }
  }
  return Buffer.concat(output);
}

/**
 * Returns a copy of the image without EXIF, XMP, IPTC, comments, text chunks
 * or trailing data. Only rendering data survives, plus the orientation tag so
 * photos keep their rotation. GPS can not survive this step.
 * @param {Buffer} buffer
 * @param {'jpeg' | 'png'} format
 * @param {{ orientation?: number }} [options]
 */
export function stripImageMetadata(buffer, format, { orientation = 1 } = {}) {
  const safeOrientation =
    Number.isInteger(orientation) && orientation >= 1 && orientation <= 8 ? orientation : 1;
  return format === 'jpeg' ? stripJpeg(buffer, safeOrientation) : stripPng(buffer, safeOrientation);
}
