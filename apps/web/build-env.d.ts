declare namespace NodeJS {
  interface ProcessEnv {
    /** Set by next.config.ts and replaced at build time. */
    readonly MOCK_API_INCLUDED?: 'true' | 'false';
  }
}
