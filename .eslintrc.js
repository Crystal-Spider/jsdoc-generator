/* eslint-disable @typescript-eslint/naming-convention */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint',
    'jsdoc',
    'import'
  ],
  rules: {
    '@typescript-eslint/naming-convention': 'warn',
    'comma-dangle': ['warn', 'never'],
    'no-cond-assign': ['error', 'always'],
    'no-console': 'warn',
    'no-constant-condition': 'warn',
    'no-control-regex': 'warn',
    'no-debugger': 'warn',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty-character-class': 'warn',
    'no-empty': 'warn',
    'no-ex-assign': 'error',
    'no-extra-semi': 'warn',
    'no-func-assign': 'warn',
    'no-inner-declarations': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-negated-in-lhs': 'error',
    'no-obj-calls': 'error',
    'no-regex-spaces': 'warn',
    'no-sparse-arrays': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'consistent-return': 'error',
    curly: ['error', 'all'],
    'default-case': 'warn',
    'dot-location': ['warn', 'property'],
    eqeqeq: [
      'warn',
      'always',
      {null: 'ignore'}
    ],
    'guard-for-in': 'warn',
    'no-alert': 'warn',
    'no-caller': 'error',
    'no-else-return': ['warn', {allowElseIf: false}],
    'no-empty-pattern': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': [
      'warn', {
        boolean: true,
        number: true,
        string: true,
        disallowTemplateShorthand: true,
        allow: ['!!']
      }
    ],
    'no-implied-eval': 'error',
    'no-invalid-this': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-spaces': 'warn',
    'no-multi-str': 'warn',
    'no-native-reassign': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'warn',
    'no-new': 'error',
    'no-octal': 'warn',
    'no-param-reassign': ['error', {props: true}],
    'no-proto': 'error',
    'no-redeclare': 'error',
    'no-return-assign': ['error', 'always'],
    'no-script-url': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'warn',
    'no-unmodified-loop-condition': 'warn',
    'no-unused-expressions': 'warn',
    'no-useless-call': 'error',
    'no-useless-concat': 'warn',
    'no-void': 'error',
    'no-warning-comments': [
      1, {terms: [
        'todo',
        'fixme',
        'wip',
        'fix',
        'placeholder'
      ]}
    ],
    'no-with': 'error',
    'no-delete-var': 'error',
    'no-shadow-restricted-names': 'error',
    '@typescript-eslint/no-shadow': 'warn',
    'no-undef-init': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }
    ],
    'no-use-before-define': 'error',
    'block-spacing': 'warn',
    'brace-style': [
      'warn',
      '1tbs',
      {allowSingleLine: true}
    ],
    camelcase: 'warn',
    'comma-spacing': 'warn',
    'comma-style': 'warn',
    'computed-property-spacing': ['warn', 'never'],
    'eol-last': ['warn', 'always'],
    indent: [
      'warn',
      2,
      {SwitchCase: 1}
    ],
    'key-spacing': 'warn',
    'keyword-spacing': [
      'warn', {overrides: {
        if: {after: false},
        for: {after: false},
        while: {after: false},
        switch: {after: false},
        catch: {after: false}
      } }
    ],
    'max-depth': ['warn', 4],
    'max-len': [
      'warn', {
        code: 120,
        comments: 120,
        tabWidth: 2
      }
    ],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 7],
    'new-parens': 'warn',
    'newline-per-chained-call': ['warn', {ignoreChainWithDepth: 3}],
    'no-inline-comments': 'warn',
    'no-lonely-if': 'warn',
    'no-multiple-empty-lines': [
      'warn', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0
      }
    ],
    'no-nested-ternary': 'warn',
    'no-whitespace-before-property': 'warn',
    'no-spaced-func': 'warn',
    'no-trailing-spaces': 'warn',
    'no-unneeded-ternary': 'warn',
    'operator-assignment': ['warn', 'always'],
    'operator-linebreak': ['warn', 'after'],
    'padded-blocks': ['warn', 'never'],
    'quote-props': ['warn', 'as-needed'],
    quotes: [
      'warn',
      'single',
      {allowTemplateLiterals: false}
    ],
    'semi-spacing': [
      'warn', {
        before: false,
        after: true
      }
    ],
    semi: ['error', 'always'],
    'space-before-blocks': 'warn',
    'space-before-function-paren': ['warn', 'never'],
    'space-in-parens': ['warn', 'never'],
    'space-infix-ops': 'warn',
    'space-unary-ops': [
      'warn', {
        words: true,
        nonwords: false
      }
    ],
    'spaced-comment': ['warn', 'always'],
    'wrap-regex': 'warn',
    'arrow-body-style': ['warn', 'as-needed'],
    'arrow-parens': ['warn', 'always'],
    'arrow-spacing': 'warn',
    'constructor-super': 'error',
    'generator-star-spacing': ['warn', 'after'],
    'no-class-assign': 'error',
    'no-const-assign': 'error',
    'no-dupe-class-members': 'error',
    'no-new-symbol': 'error',
    'no-this-before-super': 'error',
    'no-var': 'error',
    'object-shorthand': ['warn', 'always'],
    'prefer-arrow-callback': ['warn', {allowNamedFunctions: true}],
    'prefer-const': 'warn',
    'prefer-spread': 'error',
    'no-useless-catch': 'warn',
    'default-case-last': 'error',
    'default-param-last': ['warn'],
    'grouped-accessor-pairs': 'warn',
    'no-constructor-return': 'error',
    'multiline-comment-style': ['warn', 'starred-block'],
    'multiline-ternary': ['warn', 'always-multiline'],
    'capitalized-comments': ['warn'],
    'no-duplicate-imports': 'error',
    'no-useless-computed-key': ['warn', {enforceForClassMembers: true}],
    'for-direction': 'error',
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: {
          array: false,
          object: true
        },
        AssignmentExpression: {
          array: false,
          object: false
        }
      },
      {enforceForRenamedProperties: false}
    ],
    'array-bracket-spacing': ['warn', 'never'],
    'array-bracket-newline': [
      'warn', {
        multiline: true,
        minItems: 3
      }
    ],
    'array-element-newline': ['warn', {minItems: 3}],
    'object-property-newline': 'warn',
    'object-curly-spacing': [
      'warn',
      'never',
      {
        objectsInObjects: true,
        arraysInObjects: false
      }
    ],
    'object-curly-newline': [
      'warn', {
        ObjectExpression: {
          consistent: true,
          minProperties: 2
        },
        ObjectPattern: {multiline: true},
        // Replace 'never' with option for newline after each property if more than 3 (not available yet)
        ImportDeclaration: 'never',
        ExportDeclaration: 'never'
      }
    ],
    'function-call-argument-newline': ['warn', 'consistent'],
    'function-paren-newline': ['warn', 'multiline-arguments'],
    'getter-return': 'error',
    'no-setter-return': 'error',
    'no-compare-neg-zero': 'error',
    'no-import-assign': 'error',
    'no-unreachable-loop': 'warn',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'warn',
    'no-empty-function': ['warn', {allow: ['arrowFunctions', 'constructors']}],
    'no-useless-escape': 'warn',
    'no-useless-return': 'error',
    'no-undefined': 'error',
    'func-call-spacing': ['error', 'never'],
    'lines-between-class-members': ['warn', 'always'],
    'max-statements-per-line': ['warn', {max: 2}],
    'prefer-exponentiation-operator': 'warn',
    'switch-colon-spacing': [
      'warn', {
        after: true,
        before: false
      }
    ],
    'jsdoc/check-access': 'warn',
    'jsdoc/check-alignment': 'warn',
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/newline-after-description': 'warn',
    // TODO: Make it work for class methods and class attributes
    'jsdoc/require-description': [
      'warn', {
        contexts: ['any'],
        checkConstructors: false
      }
    ],
    'jsdoc/require-jsdoc': [
      'warn', {
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          MethodDefinition: true
        },
        checkSetters: true,
        checkGetters: true,
        enableFixer: false
      }
    ],
    'jsdoc/require-param-name': ['error', {contexts: ['any']}],
    'jsdoc/require-param-type': ['error', {contexts: ['any']}],
    'jsdoc/require-param': ['error', {checkSetters: true}],
    'jsdoc/require-returns-type': ['error', {contexts: ['any']}],
    'jsdoc/require-returns': 'error',
    'import/no-self-import': 'error',
    'import/no-cycle': [
      'error', {
        maxDepth: 3,
        ignoreExternal: true
      }
    ],
    'import/no-useless-path-segments': 'warn',
    'import/export': 'error',
    'import/no-deprecated': 'warn',
    /*
     * Works partially:
     * if JSDoc is the first line in file, the import will move it away from its place and puts itself under it,
     * also creating a new empty JSDoc for the code block (this for other ESLint rules).
     */
    'import/first': 'warn',
    'import/exports-last': 'warn',
    'import/order': [
      'warn', {
        groups: [
          ['builtin', 'external'],
          [
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'type',
          'object'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/newline-after-import': 'warn'
  },
  settings: {
    jsdoc: {
      tagNamePreference: {
        augments: 'extends',
        class: 'constructor'
      },
      overrideReplacesDocs: true,
      augmentsExtendsReplacesDocs: true,
      implementsReplacesDocs: true
    },
    'import/extensions': ['.js', '.ts']
  },
  ignorePatterns: [
    'out',
    'dist',
    '**/*.d.ts'
  ]
};
