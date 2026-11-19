// @ts-check
/**
 * pitchforge/disable-needs-reason
 *
 * Every `eslint-disable*` comment must say why, after ` -- `:
 *   // eslint-disable-next-line security/detect-object-injection -- key comes from a const enum
 *
 * Disabling a security or money rule without a reason hides the decision from reviewers.
 * Unused disable directives are already errors (linterOptions.reportUnusedDisableDirectives).
 */

const DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?(?:\s|$)/;

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require a reason (`-- why`) on every eslint-disable comment.' },
    schema: [],
    messages: {
      missingReason:
        'Say why this rule is disabled: add " -- <reason>" to the eslint-disable comment.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!DIRECTIVE.test(comment.value)) continue;
          const [, reason = ''] = comment.value.split(/\s--\s/, 2);
          if (reason.trim().length < 3) {
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              messageId: 'missingReason',
            });
          }
        }
      },
    };
  },
};

export default rule;
