import { crc32 } from 'node:zlib';

/*
 * Builders for synthetic JPEG and PNG files with real metadata structures
 * (EXIF IFDs, GPS IFD, XMP, comments, trailing data). They are structurally
 * valid containers, enough to test parsing and stripping byte by byte.
 */

const TYPES = { ascii: 2, short: 3, long: 4, rational: 5, srational: 10 };

function encodeValue({ type, value }, little) {
  if (type === 'ascii') {
    const bytes = Buffer.from(`${value}\0`, 'latin1');
    return { count: bytes.length, bytes };
  }
  if (type === 'short') {
    const bytes = Buffer.alloc(2);
    little ? bytes.writeUInt16LE(value) : bytes.writeUInt16BE(value);
    return { count: 1, bytes };
  }
  if (type === 'long') {
    const bytes = Buffer.alloc(4);
    little ? bytes.writeUInt32LE(value) : bytes.writeUInt32BE(value);
    return { count: 1, bytes };
  }
  const pairs = Array.isArray(value[0]) ? value : [value];
  const bytes = Buffer.alloc(8 * pairs.length);
  pairs.forEach(([numerator, denominator], index) => {
    if (type === 'srational') {
      little ? bytes.writeInt32LE(numerator, index * 8) : bytes.writeInt32BE(numerator, index * 8);
      little
        ? bytes.writeInt32LE(denominator, index * 8 + 4)
        : bytes.writeInt32BE(denominator, index * 8 + 4);
    } else {
      little
        ? bytes.writeUInt32LE(numerator, index * 8)
        : bytes.writeUInt32BE(numerator, index * 8);
      little
        ? bytes.writeUInt32LE(denominator, index * 8 + 4)
        : bytes.writeUInt32BE(denominator, index * 8 + 4);
    }
  });
  return { count: pairs.length, bytes };
}

const ifdSize = (entries) => 2 + entries.length * 12 + 4;
const dataSize = (entries, little) =>
  entries.reduce((sum, entry) => {
    const { bytes } = encodeValue(entry, little);
    return sum + (bytes.length > 4 ? bytes.length + (bytes.length % 2) : 0);
  }, 0);

function writeIfd(entries, offset, little) {
  const sorted = [...entries].sort((a, b) => a.tag - b.tag);
  const table = Buffer.alloc(ifdSize(sorted));
  const data = [];
  let dataOffset = offset + table.length;

  const u16 = (value, at) =>
    little ? table.writeUInt16LE(value, at) : table.writeUInt16BE(value, at);
  const u32 = (value, at) =>
    little ? table.writeUInt32LE(value, at) : table.writeUInt32BE(value, at);

  u16(sorted.length, 0);
  sorted.forEach((entry, index) => {
    const at = 2 + index * 12;
    const { count, bytes } = encodeValue(entry, little);
    u16(entry.tag, at);
    u16(TYPES[entry.type], at + 2);
    u32(count, at + 4);
    if (bytes.length <= 4) {
      bytes.copy(table, at + 8);
    } else {
      u32(dataOffset, at + 8);
      const padded = bytes.length % 2 ? Buffer.concat([bytes, Buffer.alloc(1)]) : bytes;
      data.push(padded);
      dataOffset += padded.length;
    }
  });
  u32(0, table.length - 4);
  return Buffer.concat([table, ...data]);
}

/**
 * @param {{ ifd0?: object[], exif?: object[], gps?: object[] }} ifds
 * @param {boolean} [little]
 */
export function buildTiff({ ifd0 = [], exif = [], gps = [] }, little = true) {
  const root = [...ifd0];
  const exifPointer = { tag: 0x8769, type: 'long', value: 0 };
  const gpsPointer = { tag: 0x8825, type: 'long', value: 0 };
  if (exif.length) root.push(exifPointer);
  if (gps.length) root.push(gpsPointer);

  const rootOffset = 8;
  const exifOffset = rootOffset + ifdSize(root) + dataSize(root, little);
  const gpsOffset = exifOffset + (exif.length ? ifdSize(exif) + dataSize(exif, little) : 0);
  exifPointer.value = exifOffset;
  gpsPointer.value = gpsOffset;

  const header = Buffer.alloc(8);
  header.write(little ? 'II' : 'MM', 0, 'latin1');
  little ? header.writeUInt16LE(42, 2) : header.writeUInt16BE(42, 2);
  little ? header.writeUInt32LE(rootOffset, 4) : header.writeUInt32BE(rootOffset, 4);

  return Buffer.concat([
    header,
    writeIfd(root, rootOffset, little),
    ...(exif.length ? [writeIfd(exif, exifOffset, little)] : []),
    ...(gps.length ? [writeIfd(gps, gpsOffset, little)] : []),
  ]);
}

/** A typical phone photo: camera data, rotated 90 degrees, with GPS. */
export function cameraTiff({ withGps = true, orientation = 6, little = true } = {}) {
  return buildTiff(
    {
      ifd0: [
        { tag: 0x010f, type: 'ascii', value: 'FUJIFILM' },
        { tag: 0x0110, type: 'ascii', value: 'X-T5' },
        { tag: 0x0112, type: 'short', value: orientation },
      ],
      exif: [
        { tag: 0x829a, type: 'rational', value: [1, 250] },
        { tag: 0x829d, type: 'rational', value: [18, 10] },
        { tag: 0x8827, type: 'short', value: 400 },
        { tag: 0x9003, type: 'ascii', value: '2026:03:14 09:26:53' },
        { tag: 0x9204, type: 'srational', value: [-1, 3] },
        { tag: 0x9207, type: 'short', value: 5 },
        { tag: 0x9209, type: 'short', value: 16 },
        { tag: 0x920a, type: 'rational', value: [23, 1] },
        { tag: 0xa434, type: 'ascii', value: 'XF23mmF1.4 R LM WR' },
      ],
      gps: withGps
        ? [
            { tag: 0x0001, type: 'ascii', value: 'N' },
            {
              tag: 0x0002,
              type: 'rational',
              value: [
                [40, 1],
                [25, 1],
                [1234, 100],
              ],
            },
            { tag: 0x0003, type: 'ascii', value: 'W' },
            {
              tag: 0x0004,
              type: 'rational',
              value: [
                [3, 1],
                [42, 1],
                [345, 100],
              ],
            },
          ]
        : [],
    },
    little,
  );
}

export const GPS_XMP =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:Description exif:GPSLatitude="40,25.2N" exif:GPSLongitude="3,42.1W"/></x:xmpmeta>';

/** Entropy-coded bytes with byte stuffing (FF 00) and a restart marker (FF D0). */
export const SCAN_DATA = Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78, 0x9a]);

function segment(marker, payload) {
  const header = Buffer.alloc(4);
  header[0] = 0xff;
  header[1] = marker;
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

/**
 * @param {{ tiff?: Buffer, xmp?: string, comment?: string, trailing?: Buffer, icc?: boolean }} [options]
 */
export function buildJpeg({ tiff, xmp, comment, trailing, icc = false } = {}) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    ...(tiff ? [segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]))] : []),
    ...(xmp
      ? [
          segment(
            0xe1,
            Buffer.concat([
              Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'),
              Buffer.from(xmp),
            ]),
          ),
        ]
      : []),
    ...(icc ? [segment(0xe2, Buffer.from('ICC_PROFILE\0\x01\x01fake-profile', 'latin1'))] : []),
    segment(0xed, Buffer.from('Photoshop 3.0\0IPTC city: Madrid', 'latin1')),
    ...(comment ? [segment(0xfe, Buffer.from(comment, 'latin1'))] : []),
    segment(0xdb, Buffer.alloc(65, 1)),
    segment(0xc0, Buffer.from([8, 0, 1, 0, 1, 1, 1, 0x11, 0])),
    segment(0xc4, Buffer.alloc(20, 0)),
    segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    SCAN_DATA,
    Buffer.from([0xff, 0xd9]),
    ...(trailing ? [trailing] : []),
  ]);
}

export function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

/**
 * @param {{ tiff?: Buffer, xmp?: string, trailing?: Buffer }} [options]
 */
export function buildPng({ tiff, xmp, trailing } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('sRGB', Buffer.from([0])),
    ...(tiff ? [pngChunk('eXIf', tiff)] : []),
    ...(xmp ? [pngChunk('iTXt', Buffer.from(`XML:com.adobe.xmp\0\0\0\0\0${xmp}`, 'latin1'))] : []),
    pngChunk('tEXt', Buffer.from('Comment\0taken at home', 'latin1')),
    pngChunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])),
    pngChunk('IEND', Buffer.alloc(0)),
    ...(trailing ? [trailing] : []),
  ]);
}

/** Chunk types in order, for assertions. */
export function pngChunkTypes(buffer) {
  const types = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    types.push(buffer.toString('latin1', offset + 4, offset + 8));
    offset += 12 + length;
  }
  return types;
}
