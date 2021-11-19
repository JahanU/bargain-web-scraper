module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
    },
    extends: [
        'airbnb-base',
    ],
    parserOptions: {
        ecmaVersion: 13,
    },
    rules: {
        'no-use-before-define': 0,
        indent: ['error', 4],
        'max-len': ['error', { code: 140 }],
        'no-console': 0,

    },
};
