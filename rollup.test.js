import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  {
    input: 'test/boilerplate/test-index.js',
    output: {
      file: 'test/test-bundle.js',
      format: 'iife',
      exports: 'named',
      name: 'mpAmplitudeKit',
      strict: false,
    },
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
    ],
  },
];
