/**
 * Minimal TIFF/EXIF reader: only what Flash displays. GPS values are never
 * read; the reader only reports whether a GPS block is present.
 */
export const TAGS = Object.freeze({
  MAKE: 0x010f,
  MODEL: 0x0110,
  ORIENTATION: 0x0112,
  EXIF_IFD: 0x8769,
  GPS_IFD: 0x8825,
  EXPOSURE_TIME: 0x829a,
  F_NUMBER: 0x829d,
  ISO: 0x8827,
  DATE_TIME_ORIGINAL: 0x9003,
  EXPOSURE_BIAS: 0x9204,
  METERING_MODE: 0x9207,
  FLASH: 0x9209,
  FOCAL_LENGTH: 0x920a,
  LENS_MODEL: 0xa434,
});

// Bytes per value for each TIFF field type.
const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8 };
const MAX_VALUE_BYTES = 4096;

/**
 * @param {Buffer} tiff TIFF block (the payload of an EXIF segment or PNG eXIf chunk)
 * @returns {{ ifd0: Map<number, unknown>, exif: Map<number, unknown>, hasGps: boolean } | null}
 */
export function readTiff(tiff) {
  if (tiff.length < 8) return null;
  const order = tiff.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const little = order === 'II';

  const u16 = (offset) => (little ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset));
  const u32 = (offset) => (little ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset));
  const i16 = (offset) => (little ? tiff.readInt16LE(offset) : tiff.readInt16BE(offset));
  const i32 = (offset) => (little ? tiff.readInt32LE(offset) : tiff.readInt32BE(offset));

  if (u16(2) !== 42) return null;

  const ratio = (numerator, denominator) => (denominator === 0 ? null : numerator / denominator);

  function readValue(type, count, offset) {
    switch (type) {
      case 2:
        return tiff
          .toString('utf8', offset, offset + count)
          .replace(/\0[\s\S]*$/, '')
          .trim();
      case 1:
      case 7:
        return tiff[offset];
      case 3:
        return u16(offset);
      case 4:
        return u32(offset);
      case 5:
        return ratio(u32(offset), u32(offset + 4));
      case 6:
        return tiff.readInt8(offset);
      case 8:
        return i16(offset);
      case 9:
        return i32(offset);
      case 10:
        return ratio(i32(offset), i32(offset + 4));
      default:
        return null;
    }
  }

  function readIfd(offset) {
    const entries = new Map();
    if (!Number.isInteger(offset) || offset < 8 || offset + 2 > tiff.length) return entries;

    const count = u16(offset);
    for (let index = 0; index < count; index++) {
      const entry = offset + 2 + index * 12;
      if (entry + 12 > tiff.length) break;

      const tag = u16(entry);
      const type = u16(entry + 2);
      const valueCount = u32(entry + 4);
      const size = TYPE_SIZES[type];
      if (!size || valueCount === 0) continue;

      const total = size * valueCount;
      if (total > MAX_VALUE_BYTES) continue;
      const valueOffset = total <= 4 ? entry + 8 : u32(entry + 8);
      if (valueOffset + total > tiff.length) continue;

      entries.set(tag, readValue(type, valueCount, valueOffset));
    }
    return entries;
  }

  const ifd0 = readIfd(u32(4));
  const exifOffset = ifd0.get(TAGS.EXIF_IFD);
  const exif = typeof exifOffset === 'number' ? readIfd(exifOffset) : new Map();

  return { ifd0, exif, hasGps: ifd0.has(TAGS.GPS_IFD) };
}

/**
 * TIFF block whose only tag is Orientation. It keeps phone photos upright
 * after every other metadata field has been removed.
 * @param {number} orientation 1 to 8
 */
export function buildOrientationTiff(orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'latin1');
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(TAGS.ORIENTATION, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(orientation, 18);
  tiff.writeUInt32BE(0, 22);
  return tiff;
}
