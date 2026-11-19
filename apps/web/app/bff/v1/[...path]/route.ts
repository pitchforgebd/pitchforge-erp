import { forwardToApi } from '../../../../lib/api/forward.ts';

interface Context {
  readonly params: Promise<{ path: string[] }>;
}

async function handle(request: Request, context: Context): Promise<Response> {
  const { path } = await context.params;
  return forwardToApi(request, path);
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
