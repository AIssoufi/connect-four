const js = require('@eslint/js');
const stylistic = require('@stylistic/eslint-plugin');
const globals = require('globals');

/**
 * The rules of Airbnb base that catch likely bugs and that the recommended rules leave out, or
 * set with other options.
 */
const PROBLEM_RULES = {
  'array-callback-return': ['error', { allowImplicit: true }],
  'getter-return': ['error', { allowImplicit: true }],
  'no-await-in-loop': 'error',
  'no-cond-assign': ['error', 'always'],
  'no-inner-declarations': 'error',
  'no-self-compare': 'error',
  'no-template-curly-in-string': 'error',
  // As in Airbnb base, a `catch` may name the error that it ignores on purpose.
  'no-unused-vars': ['error', { ignoreRestSiblings: true, caughtErrors: 'none' }],
  'no-use-before-define': 'error',
  'valid-typeof': ['error', { requireStringLiterals: true }],
};

/** The rules of Airbnb base that suggest a safer or a more modern way to write the code. */
const SUGGESTION_RULES = {
  'arrow-body-style': ['error', 'as-needed'],
  'block-scoped-var': 'error',
  camelcase: ['error', { properties: 'never' }],
  'class-methods-use-this': 'error',
  'consistent-return': 'error',
  curly: ['error', 'multi-line'],
  'default-case': ['error', { commentPattern: '^no default$' }],
  'dot-notation': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'func-names': 'warn',
  'guard-for-in': 'error',
  'max-classes-per-file': 'error',
  'new-cap': ['error', { capIsNew: false }],
  'no-alert': 'warn',
  'no-array-constructor': 'error',
  'no-bitwise': 'error',
  'no-caller': 'error',
  'no-console': 'warn',
  'no-continue': 'error',
  'no-else-return': ['error', { allowElseIf: false }],
  'no-empty-function': ['error', { allow: ['arrowFunctions', 'functions', 'methods'] }],
  'no-eval': 'error',
  'no-extend-native': 'error',
  'no-extra-bind': 'error',
  'no-extra-label': 'error',
  'no-implied-eval': 'error',
  'no-iterator': 'error',
  'no-label-var': 'error',
  'no-labels': 'error',
  'no-lone-blocks': 'error',
  'no-lonely-if': 'error',
  'no-loop-func': 'error',
  'no-multi-assign': 'error',
  'no-multi-str': 'error',
  'no-nested-ternary': 'error',
  'no-new': 'error',
  'no-new-func': 'error',
  'no-new-wrappers': 'error',
  'no-object-constructor': 'error',
  'no-octal-escape': 'error',
  'no-param-reassign': ['error', {
    props: true,
    ignorePropertyModificationsFor: [
      'acc', 'accumulator', 'e', 'ctx', 'context', 'req', 'request', 'res', 'response', '$scope',
      'staticContext',
    ],
  }],
  'no-plusplus': 'error',
  'no-proto': 'error',
  'no-restricted-globals': ['error',
    { name: 'isFinite', message: 'Use Number.isFinite instead.' },
    { name: 'isNaN', message: 'Use Number.isNaN instead.' },
  ],
  'no-restricted-properties': ['error',
    { object: 'arguments', property: 'callee', message: 'arguments.callee is deprecated.' },
    { object: 'global', property: 'isFinite', message: 'Use Number.isFinite instead.' },
    { object: 'self', property: 'isFinite', message: 'Use Number.isFinite instead.' },
    { object: 'window', property: 'isFinite', message: 'Use Number.isFinite instead.' },
    { object: 'global', property: 'isNaN', message: 'Use Number.isNaN instead.' },
    { object: 'self', property: 'isNaN', message: 'Use Number.isNaN instead.' },
    { object: 'window', property: 'isNaN', message: 'Use Number.isNaN instead.' },
    { property: '__defineGetter__', message: 'Use Object.defineProperty instead.' },
    { property: '__defineSetter__', message: 'Use Object.defineProperty instead.' },
    { object: 'Math', property: 'pow', message: 'Use the exponentiation operator (**) instead.' },
  ],
  'no-restricted-syntax': ['error',
    {
      selector: 'ForInStatement',
      message: 'for...in also walks the prototype chain: iterate over Object.keys() instead.',
    },
    {
      selector: 'ForOfStatement',
      message: 'Use an array method, such as forEach() or map(), instead of a loop.',
    },
    { selector: 'LabeledStatement', message: 'Labels make the flow of the code hard to follow.' },
    { selector: 'WithStatement', message: 'with is not allowed in strict mode.' },
  ],
  'no-return-assign': ['error', 'always'],
  'no-script-url': 'error',
  'no-sequences': 'error',
  'no-shadow': 'error',
  'no-throw-literal': 'error',
  'no-undef-init': 'error',
  'no-underscore-dangle': ['error', { enforceInMethodNames: true }],
  'no-unneeded-ternary': ['error', { defaultAssignment: false }],
  'no-unused-expressions': 'error',
  'no-useless-computed-key': 'error',
  'no-useless-concat': 'error',
  'no-useless-constructor': 'error',
  'no-useless-rename': 'error',
  'no-useless-return': 'error',
  'no-var': 'error',
  'no-void': 'error',
  'object-shorthand': ['error', 'always', { avoidQuotes: true }],
  'one-var': ['error', 'never'],
  'operator-assignment': 'error',
  'prefer-arrow-callback': 'error',
  'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
  'prefer-destructuring': ['error', {
    VariableDeclarator: { array: false, object: true },
    AssignmentExpression: { array: true, object: false },
  }],
  'prefer-numeric-literals': 'error',
  'prefer-object-spread': 'error',
  'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  radix: 'error',
  strict: ['error', 'never'],
  'symbol-description': 'error',
  'vars-on-top': 'error',
  yoda: 'error',
};

/**
 * The layout rules of Airbnb base. ESLint deprecated its own formatting rules, so they come from
 * their maintained copy, `@stylistic/eslint-plugin`, with the same options.
 */
const LAYOUT_RULES = {
  '@stylistic/array-bracket-spacing': 'error',
  '@stylistic/arrow-parens': 'error',
  '@stylistic/arrow-spacing': 'error',
  '@stylistic/block-spacing': 'error',
  '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/comma-spacing': 'error',
  '@stylistic/comma-style': 'error',
  '@stylistic/computed-property-spacing': 'error',
  '@stylistic/dot-location': ['error', 'property'],
  '@stylistic/eol-last': 'error',
  '@stylistic/function-call-spacing': 'error',
  '@stylistic/function-paren-newline': ['error', 'consistent'],
  '@stylistic/generator-star-spacing': ['error', { before: false, after: true }],
  '@stylistic/implicit-arrow-linebreak': 'error',
  '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
  '@stylistic/key-spacing': 'error',
  '@stylistic/keyword-spacing': 'error',
  '@stylistic/linebreak-style': 'error',
  '@stylistic/lines-between-class-members': 'error',
  '@stylistic/max-len': ['error', {
    code: 100,
    tabWidth: 2,
    ignoreUrls: true,
    ignoreRegExpLiterals: true,
    ignoreStrings: true,
    ignoreTemplateLiterals: true,
  }],
  '@stylistic/new-parens': 'error',
  '@stylistic/newline-per-chained-call': ['error', { ignoreChainWithDepth: 4 }],
  '@stylistic/no-confusing-arrow': 'error',
  '@stylistic/no-extra-semi': 'error',
  '@stylistic/no-floating-decimal': 'error',
  '@stylistic/no-mixed-operators': ['error', {
    groups: [
      ['%', '**'], ['%', '+'], ['%', '-'], ['%', '*'], ['%', '/'], ['/', '*'],
      ['&', '|', '<<', '>>', '>>>'], ['==', '!=', '===', '!=='], ['&&', '||'],
    ],
    allowSamePrecedence: false,
  }],
  '@stylistic/no-mixed-spaces-and-tabs': 'error',
  '@stylistic/no-multi-spaces': 'error',
  '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
  '@stylistic/no-tabs': 'error',
  '@stylistic/no-trailing-spaces': 'error',
  '@stylistic/no-whitespace-before-property': 'error',
  '@stylistic/nonblock-statement-body-position': ['error', 'beside'],
  '@stylistic/object-curly-newline': ['error', {
    ObjectExpression: { minProperties: 4, multiline: true, consistent: true },
    ObjectPattern: { minProperties: 4, multiline: true, consistent: true },
    ImportDeclaration: { minProperties: 4, multiline: true, consistent: true },
    ExportDeclaration: { minProperties: 4, multiline: true, consistent: true },
  }],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
  '@stylistic/one-var-declaration-per-line': ['error', 'always'],
  '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'none' } }],
  '@stylistic/padded-blocks': ['error',
    { blocks: 'never', classes: 'never', switches: 'never' },
    { allowSingleLineBlocks: true },
  ],
  '@stylistic/quote-props': ['error', 'as-needed'],
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  '@stylistic/rest-spread-spacing': 'error',
  '@stylistic/semi': 'error',
  '@stylistic/semi-spacing': 'error',
  '@stylistic/semi-style': 'error',
  '@stylistic/space-before-blocks': 'error',
  '@stylistic/space-before-function-paren': ['error', {
    anonymous: 'always',
    named: 'never',
    asyncArrow: 'always',
  }],
  '@stylistic/space-in-parens': 'error',
  '@stylistic/space-infix-ops': 'error',
  '@stylistic/space-unary-ops': 'error',
  '@stylistic/spaced-comment': ['error', 'always', {
    line: { exceptions: ['-', '+'], markers: ['=', '!', '/'] },
    block: { exceptions: ['-', '+'], markers: ['=', '!', ':', '::'], balanced: true },
  }],
  '@stylistic/switch-colon-spacing': 'error',
  '@stylistic/template-curly-spacing': 'error',
  '@stylistic/template-tag-spacing': 'error',
  '@stylistic/wrap-iife': ['error', 'outside'],
  '@stylistic/yield-star-spacing': 'error',
  'unicode-bom': 'error',
};

/**
 * Browser globals that are easy to use by mistake, such as `name` or `event` for a variable
 * that was never declared. Airbnb base forbids them in the page scripts.
 */
const CONFUSING_BROWSER_GLOBALS = [
  'addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus', 'defaultstatus',
  'event', 'external', 'find', 'focus', 'frameElement', 'frames', 'history', 'innerHeight',
  'innerWidth', 'length', 'location', 'locationbar', 'menubar', 'moveBy', 'moveTo', 'name',
  'onblur', 'onerror', 'onfocus', 'onload', 'onresize', 'onunload', 'open', 'opener', 'opera',
  'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print',
  'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft', 'screenTop', 'screenX',
  'screenY', 'scroll', 'scrollbars', 'scrollBy', 'scrollTo', 'scrollX', 'scrollY', 'self',
  'status', 'statusbar', 'stop', 'toolbar', 'top',
];

/**
 * ESLint configuration: the recommended rules, plus the rules of Airbnb base that the code was
 * written against. The code runs in Node.js and on the Worker, except the page scripts of
 * `public/`, which run in the browser as classic scripts.
 */
module.exports = [
  // The local state of `wrangler dev`, which holds generated code.
  { ignores: ['.wrangler/'] },
  js.configs.recommended,
  {
    plugins: { '@stylistic': stylistic },
    rules: { ...PROBLEM_RULES, ...SUGGESTION_RULES, ...LAYOUT_RULES },
  },
  // Kept away from the page scripts, since the globals of each block add up.
  {
    ignores: ['public/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
    rules: {
      'no-restricted-globals': [
        ...SUGGESTION_RULES['no-restricted-globals'],
        ...CONFUSING_BROWSER_GLOBALS,
      ],
    },
  },
];
