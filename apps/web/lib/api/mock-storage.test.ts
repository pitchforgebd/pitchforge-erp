import { describe, expect, it } from 'vitest';

import { MOCK_STORAGE_ORIGIN, publicOrigin, withLocalStorageLinks } from './mock-storage.ts';

describe('mock storage links', () => {
  it('moves mock storage links onto this origin and leaves everything else alone', () => {
    const body = {
      fileId: 'f1',
      uploadUrl: `${MOCK_STORAGE_ORIGIN}/upload/f1`,
      expiresAt: '2026-11-21T04:05:00Z',
    };
    expect(withLocalStorageLinks(body, 'https://erp.example')).toEqual({
      ...body,
      uploadUrl: 'https://erp.example/bff/mock-storage/upload/f1',
    });
    const real = { downloadUrl: 'https://storage.example/bucket/f1?signature=x' };
    expect(withLocalStorageLinks(real, 'https://erp.example')).toEqual(real);
    expect(withLocalStorageLinks(null, 'https://erp.example')).toBeNull();
  });

  it('uses the origin the browser saw, behind a proxy too', () => {
    const direct = new Request('http://localhost:3000/bff/v1/core/files:create-upload');
    expect(publicOrigin(direct)).toBe('http://localhost:3000');
    const proxied = new Request('http://127.0.0.1:3000/x', {
      headers: { 'x-forwarded-host': 'erp.example', 'x-forwarded-proto': 'https' },
    });
    expect(publicOrigin(proxied)).toBe('https://erp.example');
  });
});
