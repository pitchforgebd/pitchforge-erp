// @ts-check
/**
 * pitchforge/no-float-money
 *
 * Money must be `Money` from @pitchforge/shared-kernel (integer poisha + currency), never a
 * JavaScript `number` (CLAUDE.md rule 3, coding standards "Backend rules" 4).
 *
 * The rule needs type information. It reports:
 *  1. float conversions applied to a money-named value: parseFloat(x), Number(x),
 *     Number.parseFloat(x), +x, x.toFixed(n)
 *  2. a money-named variable, parameter or property whose type is `number`
 *  3. arithmetic (+ - * / %) where an operand is a money-named value of type `number`
 *
 * "Money-named" means one of the camelCase / snake_case words of the name is in MONEY_WORDS
 * and none is in NON_MONEY_WORDS (so `totalPages`, `taxRate` and `amountCount` are allowed).
 */

import ts from 'typescript';

const MONEY_WORDS = new Set([
  'amount',
  'amounts',
  'total',
  'subtotal',
  'net',
  'gross',
  'vat',
  'tax',
  'tds',
  'vds',
  'ait',
  'balance',
  'salary',
  'price',
  'cost',
  'fee',
  'fees',
  'poisha',
  'paisa',
  'taka',
  'bdt',
  'money',
  'debit',
  'credit',
  'payable',
  'receivable',
  'drawing',
  'capital',
]);

// Words that turn a money-looking name into a count, ratio or other non-money quantity.
const NON_MONEY_WORDS = new Set([
  'count',
  'counts',
  'page',
  'pages',
  'item',
  'items',
  'row',
  'rows',
  'line',
  'lines',
  'percent',
  'percentage',
  'pct',
  'rate',
  'ratio',
  'weight',
  'days',
  'hours',
  'minutes',
  'seconds',
  'ms',
  'digits',
  'decimals',
  'index',
  'idx',
  'length',
  'size',
  'limit',
  'version',
  'width',
  'height',
]);

/** @param {string} name */
export function splitWords(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_$-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** @param {string} name */
export function isMoneyName(name) {
  const words = splitWords(name);
  return words.some((w) => MONEY_WORDS.has(w)) && !words.some((w) => NON_MONEY_WORDS.has(w));
}

/**
 * The name a value is known by: identifier, member property or `this.x`.
 * @param {import('estree').Node | null | undefined} node
 * @returns {string | null}
 */
function nameOf(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (node.type === 'MemberExpression' && node.computed && node.property.type === 'Literal') {
    return typeof node.property.value === 'string' ? node.property.value : null;
  }
  return null;
}

const FLOAT_CALLEES = new Set(['parseFloat', 'Number']);

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow floating-point `number` handling of money; use Money (integer poisha).',
    },
    schema: [],
    messages: {
      floatConversion:
        "'{{name}}' looks like money: do not convert it with {{how}}. Parse it with Money.parse() from @pitchforge/shared-kernel.",
      numberType:
        "'{{name}}' looks like money but has type number. Use Money from @pitchforge/shared-kernel (integer poisha + currency).",
      numberArithmetic:
        "Arithmetic on '{{name}}' (type number) looks like money maths. Use Money.add/subtract/multiplyByRate.",
    },
  },

  create(context) {
    const services = context.sourceCode.parserServices;
    const hasTypes = Boolean(services && services.program && services.esTreeNodeToTSNodeMap);
    if (!hasTypes) {
      // Without type information the rule cannot tell `number` from `Money`; stay silent
      // rather than produce noise. The shared ESLint config always enables type information.
      return {};
    }
    /** @type {import('typescript').TypeChecker} */
    const checker = services.program.getTypeChecker();

    /** @param {import('estree').Node} node */
    function isNumberTyped(node) {
      /** @type {import('typescript').Node | undefined} */
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (!tsNode) return false;
      const type = checker.getTypeAtLocation(tsNode);
      /** @type {readonly import('typescript').Type[]} */
      const parts = type.isUnion() ? type.types : [type];
      return parts.some((t) => (t.flags & ts.TypeFlags.NumberLike) !== 0);
    }

    /** @param {import('estree').Node} node @param {string} name */
    function reportIfNumberTyped(node, name) {
      if (isMoneyName(name) && isNumberTyped(node)) {
        context.report({ node, messageId: 'numberType', data: { name } });
      }
    }

    return {
      CallExpression(node) {
        const arg = node.arguments[0];
        const argName = arg && arg.type !== 'SpreadElement' ? nameOf(arg) : null;

        // parseFloat(x), Number(x)
        if (node.callee.type === 'Identifier' && FLOAT_CALLEES.has(node.callee.name)) {
          if (argName && isMoneyName(argName)) {
            context.report({
              node,
              messageId: 'floatConversion',
              data: { name: argName, how: `${node.callee.name}()` },
            });
          }
          return;
        }

        if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
          const prop = node.callee.property.type === 'Identifier' ? node.callee.property.name : '';
          // Number.parseFloat(x)
          if (
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Number' &&
            prop === 'parseFloat' &&
            argName &&
            isMoneyName(argName)
          ) {
            context.report({
              node,
              messageId: 'floatConversion',
              data: { name: argName, how: 'Number.parseFloat()' },
            });
            return;
          }
          // x.toFixed(n)
          if (prop === 'toFixed') {
            const objName = nameOf(node.callee.object);
            if (objName && isMoneyName(objName)) {
              context.report({
                node,
                messageId: 'floatConversion',
                data: { name: objName, how: '.toFixed()' },
              });
            }
          }
        }
      },

      UnaryExpression(node) {
        if (node.operator !== '+') return;
        const name = nameOf(node.argument);
        if (name && isMoneyName(name)) {
          context.report({ node, messageId: 'floatConversion', data: { name, how: 'unary +' } });
        }
      },

      BinaryExpression(node) {
        if (!['+', '-', '*', '/', '%'].includes(node.operator)) return;
        for (const side of [node.left, node.right]) {
          if (side.type === 'PrivateIdentifier') continue;
          const name = nameOf(side);
          if (name && isMoneyName(name) && isNumberTyped(side)) {
            context.report({ node: side, messageId: 'numberArithmetic', data: { name } });
          }
        }
      },

      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') reportIfNumberTyped(node.id, node.id.name);
      },

      // Function parameters (identifiers directly in a params list)
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        /** @type {import('estree').Function} */ node,
      ) {
        for (const param of node.params) {
          if (param.type === 'Identifier') reportIfNumberTyped(param, param.name);
          if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
            reportIfNumberTyped(param.left, param.left.name);
          }
        }
      },

      // Interface / type-literal members: `{ amount: number }`
      /** @param {any} node TSPropertySignature (typescript-eslint AST, not in estree types) */
      TSPropertySignature(node) {
        const name = nameOf(node.key);
        if (name) reportIfNumberTyped(node.key, name);
      },

      // Object literal properties: `{ amount: 1250.5 }`
      /** @param {any} node Property */
      'ObjectExpression > Property'(node) {
        if (node.kind !== 'init' || node.method) return;
        const name = nameOf(node.key);
        if (name) reportIfNumberTyped(node.value, name);
      },

      // Class fields: `total = 0`
      /** @param {any} node PropertyDefinition */
      PropertyDefinition(node) {
        const name = nameOf(node.key);
        if (name) reportIfNumberTyped(node.key, name);
      },
    };
  },
};

export default rule;
