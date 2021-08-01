/**
 * @type {import('eslint').Linter.Config}
 */
const config = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/indent': [
            'error',
            4,
            { SwitchCase: 1, ignoredNodes: ['TSTypeParameterInstantiation'] }
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single',
            { allowTemplateLiterals: true }
        ],
        'semi': [
            'error',
            'always'
        ],
        'eqeqeq': 'error',
        'no-var': 'error',
    },
    overrides: [
        {
            files: '*.js',
            rules: {
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ]
};

module.exports = config;