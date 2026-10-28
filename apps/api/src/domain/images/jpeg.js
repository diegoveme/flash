import { UnsupportedMediaTypeError } from '../../lib/errors.js';

export const JPEG = Object.freeze({
  SOI: 0xd8,
  EOI: 0xd9,
  SOS: 0xda,
  APP0: 0xe0,
  APP1: 0xe1,
  APP2: 0xe2,
  APP14: 0xee,
  APP15: 0xef,
  COM: 0xfe,
});

const corrupt = () => new UnsupportedMediaTypeError('The JPEG file is corrupt.');
const isRestart = (marker) => marker >= 0xd0 && marker <= 0xd7;

/**
 * Splits a JPEG into parts. `buffer.subarray(part.start, part.end)` is the
 * whole segment, marker included. Entropy-coded scan data is returned as a
 * part with `marker: null`. Parsing stops at the first EOI, so data appended
 * after the main image (for example MPF secondary images) is never kept.
 * @param {Buffer} buffer
 * @returns {{ marker: number | null, start: number, end: number }[]}
 */
export function parseJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== JPEG.SOI) throw corrupt();

  const parts = [{ marker: JPEG.SOI, start: 0, end: 2 }];
  let offset = 2;
  let seenScan = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw corrupt();

    let markerOffset = offset;
    while (markerOffset + 1 < buffer.length && buffer[markerOffset + 1] === 0xff) markerOffset++;
    const marker = buffer[markerOffset + 1];
    if (marker === undefined) break;

    if (marker === JPEG.EOI) {
      parts.push({ marker, start: markerOffset, end: markerOffset + 2 });
      return parts;
    }

    if (isRestart(marker) || marker === 0x01) {
      parts.push({ marker, start: markerOffset, end: markerOffset + 2 });
      offset = markerOffset + 2;
      continue;
    }

    if (markerOffset + 4 > buffer.length) throw corrupt();
    const length = buffer.readUInt16BE(markerOffset + 2);
    const end = markerOffset + 2 + length;
    if (length < 2 || end > buffer.length) throw corrupt();
    parts.push({ marker, start: markerOffset, end });
    offset = end;

    if (marker === JPEG.SOS) {
      seenScan = true;
      let scan = offset;
      while (scan < buffer.length) {
        if (buffer[scan] === 0xff && scan + 1 < buffer.length) {
          const next = buffer[scan + 1];
          if (next === 0x00 || isRestart(next)) {
            scan += 2;
            continue;
          }
          break;
        }
        scan++;
      }
      parts.push({ marker: null, start: offset, end: Math.min(scan, buffer.length) });
      offset = scan;
    }
  }

  // Some encoders omit the final EOI. Accept it only after image data.
  if (!seenScan) throw corrupt();
  return parts;
}

/**
 * Payload of a segment (after marker and length).
 * @param {Buffer} buffer
 * @param {{ start: number, end: number }} part
 */
export function segmentPayload(buffer, part) {
  return buffer.subarray(part.start + 4, part.end);
}

const EXIF_HEADER = Buffer.from('Exif\0\0', 'latin1');
const XMP_HEADERS = [
  Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'),
  Buffer.from('http://ns.adobe.com/xmp/extension/\0', 'latin1'),
];

/** @param {Buffer} payload */
export function isExifPayload(payload) {
  return payload.subarray(0, EXIF_HEADER.length).equals(EXIF_HEADER);
}

/** @param {Buffer} payload */
export function exifTiff(payload) {
  return payload.subarray(EXIF_HEADER.length);
}

/** @param {Buffer} payload */
export function isXmpPayload(payload) {
  return XMP_HEADERS.some((header) => payload.subarray(0, header.length).equals(header));
}

/**
 * Builds an APP1 EXIF segment that wraps the given TIFF block.
 * @param {Buffer} tiff
 */
export function buildExifSegment(tiff) {
  const header = Buffer.alloc(4);
  header[0] = 0xff;
  header[1] = JPEG.APP1;
  header.writeUInt16BE(2 + EXIF_HEADER.length + tiff.length, 2);
  return Buffer.concat([header, EXIF_HEADER, tiff]);
}
