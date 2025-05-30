/* eslint-disable @typescript-eslint/naming-convention */
import {fixupPluginRules} from '@eslint/compat';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: [
      'node_modules/**/*',
      '.vscode-test/**/*',
      'out/**/*',
      '**/*.d.ts',
      'eslint.config.mjs'
    ],
    files: ['**/*.ts']
  }, {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      jsdoc,
      import: fixupPluginRules(_import),
      'unused-imports': unusedImports
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',
      parserOptions: {
        project: ['tsconfig.json']
      }
    },
    settings: {
      jsdoc: {
        tagNamePreference: {
          access: false,
          export: 'export',
          augments: 'extends',
          'tag constructor': 'constructor',
          todo: {
            message: 'Implement todo related task.'
          }
        },
        implementsReplacesDocs: false,
        augmentsExtendsReplacesDocs: false,
        preferredTypes: {
          any: {
            message: 'Prefer the use of \'*\' over \'any\'.',
            replacement: '*'
          },
          'Array<>': {
            message: 'Prefer the use of \'[]\' over \'Array<>\'.',
            replacement: '[]'
          },
          structuredTags: {
            param: 'type'
          }
        }
      },
      'import/extensions': [
        '.js',
        '.mjs',
        '.ts',
        '.json'
      ]
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: [
            'variable',
            'function',
            'parameter',
            'property',
            'method'
          ],
          format: ['camelCase']
        },
        {
          selector: ['variable', 'parameter'],
          format: ['camelCase'],
          modifiers: ['unused'],
          leadingUnderscore: 'require'
        },
        {
          selector: 'variable',
          format: [
            'camelCase',
            'UPPER_CASE',
            'PascalCase'
          ],
          modifiers: ['global']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        },
        {
          selector: 'property',
          format: ['camelCase'],
          modifiers: ['private'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'property',
          format: ['camelCase'],
          modifiers: ['protected'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        }
      ],
      'comma-dangle': ['warn', 'never'],
      'no-cond-assign': ['error', 'always'],
      'no-console': ['warn', {allow: ['warn', 'error']}],
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
      '@typescript-eslint/dot-notation': [
        'warn', {
          allowPrivateClassPropertyAccess: true,
          allowProtectedClassPropertyAccess: true
        }
      ],
      'newline-per-chained-call': [
        'warn', {
          ignoreChainWithDepth: 5
        }
      ],
      eqeqeq: [
        'warn',
        'always',
        {
          null: 'ignore'
        }
      ],
      'guard-for-in': 'warn',
      'no-alert': 'warn',
      'no-caller': 'error',
      'no-else-return': [
        'warn', {
          allowElseIf: false
        }
      ],
      'no-empty-pattern': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-floating-decimal': 'error',
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
      'no-param-reassign': [
        'error', {
          props: true
        }
      ],
      'no-proto': 'error',
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
        1, {
          terms: [
            'todo',
            'fixme',
            'wip',
            'fix',
            'placeholder',
            'tellme'
          ]
        }
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
        {
          allowSingleLine: true
        }
      ],
      camelcase: 'warn',
      'comma-spacing': 'warn',
      'comma-style': 'warn',
      'computed-property-spacing': ['warn', 'never'],
      'eol-last': ['warn', 'always'],
      indent: [
        'warn',
        2,
        {
          SwitchCase: 1
        }
      ],
      'key-spacing': 'warn',
      'keyword-spacing': 'warn',
      'max-depth': ['warn', 6],
      'max-len': [
        'warn', {
          code: 255,
          comments: 255,
          tabWidth: 2,
          ignorePattern: '^import'
        }
      ],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 7],
      'new-parens': 'warn',
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
      'no-trailing-spaces': [
        'warn', {
          ignoreComments: true
        }
      ],
      'no-unneeded-ternary': 'warn',
      'operator-assignment': ['warn', 'always'],
      'operator-linebreak': ['warn', 'after'],
      'padded-blocks': ['warn', 'never'],
      'quote-props': ['warn', 'as-needed'],
      quotes: [
        'warn',
        'single',
        {
          allowTemplateLiterals: false
        }
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
      'arrow-body-style': ['warn', 'as-needed'],
      'arrow-parens': ['warn', 'as-needed'],
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
      'prefer-arrow-callback': [
        'warn', {
          allowNamedFunctions: true
        }
      ],
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
      'no-useless-computed-key': [
        'warn', {
          enforceForClassMembers: true
        }
      ],
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
        {
          enforceForRenamedProperties: false
        }
      ],
      'array-bracket-spacing': ['warn', 'never'],
      'array-bracket-newline': [
        'warn', {
          multiline: true,
          minItems: 3
        }
      ],
      'array-element-newline': [
        'warn', {
          minItems: 3
        }
      ],
      'object-property-newline': [
        'warn', {
          allowAllPropertiesOnSameLine: true
        }
      ],
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
            minProperties: 6
          },
          ObjectPattern: {
            consistent: false,
            minProperties: 10
          },
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
      'no-empty-function': [
        'warn', {
          allow: ['arrowFunctions', 'constructors']
        }
      ],
      'no-useless-escape': 'warn',
      'no-useless-return': 'error',
      'func-call-spacing': ['error', 'never'],
      'lines-between-class-members': ['warn', 'always'],
      'max-statements-per-line': [
        'warn', {
          max: 2
        }
      ],
      'prefer-exponentiation-operator': 'warn',
      'switch-colon-spacing': [
        'warn', {
          after: true,
          before: false
        }
      ],
      'jsdoc/check-access': 'warn',
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/empty-tags': [
        'warn', {
          tags: ['export']
        }
      ],
      'jsdoc/match-description': [
        'warn', {
          tags: {
            param: {
              match: '^([a-z][\\s\\S]*[.?!])?$',
              message:
                'Parameter description should begin with a lower case letter and end with a full stop.'
            },
            returns: {
              match: '^([a-z]|[\\s\\S]*[.?!])?$',
              message:
                'Return value description should begin with a lower case letter and end with a full stop.'
            },
            template: {
              match:
                '^(extends\\s(keyof\\s)?\\{@link\\s\\S*\\}(\\s=\\s\\{@link\\s\\S*\\})?)?$',
              message:
                'Template description should match this format: \'extends (keyof)? {@link VALUE}( = {@link VALUE})?\'\nwhere \'VALUE\' can be replaced with any string and \'(string)?\' is an optional part of the description.'
            },
            constructor: {
              match: '^$',
              message: '@constructor should be empty.'
            }
          },
          message:
            'Block comment description should begin with an upper case letter and end with any punctuation sign in [.!?].',
          contexts: ['any']
        }
      ],
      'jsdoc/multiline-blocks': [
        'warn', {
          noSingleLineBlocks: true,
          singleLineTags: []
        }
      ],
      'jsdoc/no-multi-asterisks': 'warn',
      'jsdoc/require-description': [
        'warn', {
          contexts: ['any'],
          exemptedBy: ['inheritdoc', 'constructor']
        }
      ],
      'jsdoc/require-hyphen-before-param-description': [
        'warn',
        'never',
        {
          tags: {
            '*': 'never'
          }
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
          enableFixer: false,
          contexts: [
            'ClassProperty',
            'Interface',
            'TSPropertySignature',
            'TSMethodSignature',
            'TSTypeAliasDeclaration',
            'TSInterfaceDeclaration',
            'TSEnumDeclaration'
          ]
        }
      ],
      'jsdoc/require-param-name': [
        'warn', {
          contexts: ['any']
        }
      ],
      'jsdoc/require-param-type': [
        'warn', {
          contexts: ['any']
        }
      ],
      'jsdoc/require-param': [
        'warn', {
          checkSetters: true
        }
      ],
      'jsdoc/require-returns-check': [
        'warn', {
          exemptGenerators: false,
          exemptAsync: false,
          reportMissingReturnForUndefinedTypes: true
        }
      ],
      'jsdoc/require-returns-type': [
        'warn', {
          contexts: ['any']
        }
      ],
      'jsdoc/require-returns': 'warn',
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
      'import/newline-after-import': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn', {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ]
    }
  }
];
