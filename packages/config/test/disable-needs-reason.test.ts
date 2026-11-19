import rule from '../eslint/rules/disable-needs-reason.mjs';

import { FIXTURE_FILE, typedRuleTester } from './rule-tester.ts';

const filename = FIXTURE_FILE;

typedRuleTester().run('pitchforge/disable-needs-reason', rule, {
  valid: [
    {
      filename,
      code: '// eslint-disable-next-line no-console -- CLI output for developers\nconsole.log(1);',
    },
    { filename, code: '/* eslint-disable no-console -- generated file */' },
    { filename, code: '// a normal comment that mentions eslint-disable later' },
  ],
  invalid: [
    {
      filename,
      code: '// eslint-disable-next-line no-console\nconsole.log(1);',
      errors: [{ messageId: 'missingReason' }],
    },
    { filename, code: '/* eslint-disable no-console */', errors: [{ messageId: 'missingReason' }] },
    {
      filename,
      code: '// eslint-disable-line no-console -- x\n',
      errors: [{ messageId: 'missingReason' }],
    },
  ],
});
