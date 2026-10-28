import { crc32 } from 'node:zlib';
import { UnsupportedMediaTypeError } from '../../lib/errors.js';

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const corrupt = () => new UnsupportedMediaTypeError('The PNG file is corrupt.');

/**
 * Splits a PNG into chunks. Parsing stops at IEND, so trailing data is dropped.
 * @param {Buffer} buffer
 * @returns {{ type: string, start: number, end: number, data: Buffer }[]}
 */
export function parsePng(buffer) {
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw corrupt();
  }

  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const end = dataStart + length + 4;
    if (!/^[A-Za-z]{4}$/.test(type) || end > buffer.length) throw corrupt();
    chunks.push({ type, start: offset, end, data: buffer.subarray(dataStart, dataStart + length) });
    offset = end;
    if (type === 'IEND') return chunks;
  }
  throw corrupt();
}

/**
 * @param {string} type four-letter chunk type
 * @param {Buffer} data
 */
export function buildChunk(type, data) {
  const typeBytes = Buffer.from(type, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}
