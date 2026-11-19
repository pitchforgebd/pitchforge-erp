/** Runs once when the server starts. It validates the environment, and starts mock mode. */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const { serverConfig } = await import('./lib/config/env.ts');
  const config = serverConfig();
  if (config.apiMode !== 'mock') return;

  // Next replaces this variable at build time. The compiler drops the branch it can prove is
  // never taken, so a build made with BUILD_WITHOUT_MOCKS=true holds no mock code.
  if (process.env.MOCK_API_INCLUDED === 'true') {
    const { startMockServer } = await import('./mocks/server.ts');
    startMockServer(config.realModules);
  } else {
    throw new Error('API_MODE=mock is refused: this build has no mock API');
  }
}
