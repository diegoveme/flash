import { describe, expect, it } from 'bun:test';
import { authPath, paths, safeNextPath } from './routing.js';

describe('safeNextPath', () => {
  it('accepts internal paths', () => {
    expect(safeNextPath('/posts/abc?x=1')).toBe('/posts/abc?x=1');
  });

  it('rejects other origins and auth loops', () => {
    expect(safeNextPath('//evil.example')).toBe('/');
    expect(safeNextPath('https://evil.example')).toBe('/');
    expect(safeNextPath('/auth?next=/new')).toBe('/');
    expect(safeNextPath(null)).toBe('/');
  });
});

describe('authPath', () => {
  it('encodes the return path', () => {
    expect(authPath('/new')).toBe('/auth?next=%2Fnew');
    expect(authPath()).toBe('/auth');
  });
});

describe('paths', () => {
  it('encodes params', () => {
    expect(paths.post('a/b')).toBe('/posts/a%2Fb');
    expect(paths.profile('clara.soto')).toBe('/u/clara.soto');
  });
});
