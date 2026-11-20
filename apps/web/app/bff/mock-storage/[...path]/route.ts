import { MAX_FILE_BYTES } from '@pitchforge/contracts';

import { isSameOriginWrite } from '../../../../lib/api/forward.ts';
import { SAMPLE_PDF } from '../../../../lib/api/mock-storage.ts';
import { serverConfig } from '../../../../lib/config/env.ts';

/**
 * Stand-in object storage for mock mode (see lib/api/mock-storage.ts). It accepts an upload and
 * forgets it, and serves the same sample PDF for every download. It answers nothing in real mode
 * and nothing without a session.
 */
interface Context {
  readonly params: Promise<{ path: string[] }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_COOKIE = '__Host-pf_session';

async function target(request: Request, context: Context, kind: 'upload' | 'download') {
  const { path } = await context.params;
  const [first, id, ...rest] = path;
  const signedIn = request.headers.get('cookie')?.includes(`${SESSION_COOKIE}=`) === true;
  return (
    serverConfig().apiMode === 'mock' &&
    signedIn &&
    first === kind &&
    id !== undefined &&
    UUID.test(id) &&
    rest.length === 0
  );
}

const notFound = () => new Response(null, { status: 404 });

export async function PUT(request: Request, context: Context): Promise<Response> {
  if (!(await target(request, context, 'upload'))) return notFound();
  if (!isSameOriginWrite(request)) return new Response(null, { status: 403 });
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_FILE_BYTES) return new Response(null, { status: 413 });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_FILE_BYTES) return new Response(null, { status: 413 });
  return new Response(null, { status: 200 });
}

export async function GET(request: Request, context: Context): Promise<Response> {
  if (!(await target(request, context, 'download'))) return notFound();
  return new Response(SAMPLE_PDF, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="pitchforge-sample.pdf"',
      'cache-control': 'no-store',
    },
  });
}
