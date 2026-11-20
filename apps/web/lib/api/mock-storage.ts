/**
 * Object storage in mock mode. The real API hands out short-lived signed URLs on the storage
 * host; the mocks hand out URLs on a host that does not exist, and the BFF points them at
 * /bff/mock-storage on this app's own origin, so uploads and downloads work under the strict
 * Content-Security-Policy without a storage server. Server-side only, and only in mock mode.
 */
export const MOCK_STORAGE_ORIGIN = 'https://storage.mock.invalid';

/** The origin the browser used, behind a reverse proxy too. */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

const LINK_FIELDS = ['uploadUrl', 'downloadUrl'] as const;

/** The same JSON with mock storage links moved onto this origin. */
export function withLocalStorageLinks(body: unknown, origin: string): unknown {
  if (typeof body !== 'object' || body === null) return body;
  const fields = new Map<string, unknown>(Object.entries(body));
  for (const field of LINK_FIELDS) {
    const link = fields.get(field);
    if (typeof link === 'string' && link.startsWith(`${MOCK_STORAGE_ORIGIN}/`)) {
      fields.set(field, `${origin}/bff/mock-storage/${link.slice(MOCK_STORAGE_ORIGIN.length + 1)}`);
    }
  }
  return Object.fromEntries(fields);
}

/** A one-page PDF that says it is a sample, served for every mock download. */
export const SAMPLE_PDF = [
  '%PDF-1.4',
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
  '4 0 obj << /Length 74 >> stream',
  'BT /F1 18 Tf 72 760 Td (Pitchforge ERP - sample document, no real data) Tj ET',
  'endstream endobj',
  '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  'trailer << /Root 1 0 R >>',
  '%%EOF',
].join('\n');
