const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'node_modules/**', '.expo/**'] },
  {
    rules: {
      // React Compiler is not enabled for this app. Its opt-in checks flag
      // imperative RN Animated refs and server hydration effects as errors.
      // Keep rules-of-hooks and exhaustive-deps enabled for runtime correctness.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
