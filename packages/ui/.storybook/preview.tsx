import type { Preview } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

import '../src/styles/globals.css';

function Panel({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <div data-theme={theme} className="min-w-0 flex-1 bg-bg p-4 text-fg">
      {children}
    </div>
  );
}

/** Portalled content (dialogs) renders on <body>, so its theme is set on the document. */
function DocumentTheme({ theme, children }: { theme: string; children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);
  return <div className="bg-bg p-4 text-fg">{children}</div>;
}

const preview: Preview = {
  parameters: {
    // Any accessibility violation fails the story's test (WCAG 2.1 AA).
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      // `themes: 'both'` shows light and dark together, so axe checks both in one run.
      if (context.parameters['themes'] === 'both') {
        return (
          <div className="flex flex-wrap">
            <Panel theme="light">
              <Story />
            </Panel>
            <Panel theme="dark">
              <Story />
            </Panel>
          </div>
        );
      }
      const theme = (context.parameters['theme'] as string | undefined) ?? 'light';
      return (
        <DocumentTheme theme={theme}>
          <Story />
        </DocumentTheme>
      );
    },
  ],
};

export default preview;
