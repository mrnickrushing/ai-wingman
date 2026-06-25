// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', 'eslint.config.js', 'babel.config.js'],
  },
  {
    rules: {
      // The React Compiler is NOT enabled in this app's build, so its strict
      // ref/purity/immutability diagnostics fire on standard React Native
      // patterns (e.g. reading Animated.Value refs during render). Keep them
      // visible as warnings instead of CI-blocking errors. Remove these
      // overrides if/when the React Compiler is turned on.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/array-type': 'off',
      // tsc validates imports far more accurately than this rule, which
      // false-positives on native-module namespace members (expo-audio).
      'import/namespace': 'off',
    },
  },
];
