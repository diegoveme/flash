import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countCharacters, normalizeTags, TAGS_MAX_COUNT } from '../src/index.js';

describe('countCharacters', () => {
  it('counts emoji and accented letters once', () => {
    assert.equal(countCharacters('café'), 4);
    assert.equal(countCharacters('📷📷'), 2);
  });
});

describe('normalizeTags', () => {
  it('trims, lowercases, removes # and duplicates', () => {
    const { tags, invalid } = normalizeTags(' Street, #Monochrome, street ,');
    assert.deepEqual(tags, ['street', 'monochrome']);
    assert.deepEqual(invalid, []);
  });

  it('accepts arrays and reports invalid entries', () => {
    const { tags, invalid } = normalizeTags(['ok', 'not valid', 42]);
    assert.deepEqual(tags, ['ok']);
    assert.deepEqual(invalid, ['not valid', '42']);
  });

  it('caps the number of tags', () => {
    const many = Array.from({ length: TAGS_MAX_COUNT + 2 }, (_, i) => `t${i}`);
    const { tags, invalid } = normalizeTags(many);
    assert.equal(tags.length, TAGS_MAX_COUNT);
    assert.equal(invalid.length, 2);
  });
});
