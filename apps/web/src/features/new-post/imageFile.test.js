import { describe, expect, it } from 'bun:test';
import { IMAGE_MAX_BYTES } from '@flash/shared';
import { validateImageFile } from './imageFile.js';

describe('validateImageFile', () => {
  it('accepts JPEG and PNG up to 10 MB', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateImageFile({ type: 'image/png', size: IMAGE_MAX_BYTES })).toBeNull();
  });

  it('rejects other types', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1024 })).toContain('JPEG');
    expect(validateImageFile({ type: 'image/webp', size: 1024 })).not.toBeNull();
  });

  it('rejects empty and oversized files', () => {
    expect(validateImageFile({ type: 'image/png', size: 0 })).not.toBeNull();
    expect(validateImageFile({ type: 'image/png', size: IMAGE_MAX_BYTES + 1 })).toContain('10 MB');
    expect(validateImageFile(null)).not.toBeNull();
  });
});
