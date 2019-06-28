import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
    {
        input: 'src/Amplitude.js',
        output: {
            file: 'Amplitude.js',
            format: 'iife',
            exports: 'named',
            name: 'mpAmplitudeKit',
            strict: false
        },
        plugins: [
            resolve({
                browser: true
            }),
            commonjs()
        ]
    },
    {
        input: 'src/Amplitude.js',
        output: {
            file: 'dist/Amplitude.js',
            format: 'iife',
            exports: 'named',
            name: 'mpAmplitudeKit',
            strict: false
        },
        plugins: [
            resolve({
                browser: true
            }),
            commonjs()
        ]
    },
    {
        input: 'src/Amplitude.js',
        output: {
            file: 'npm/Amplitude.js',
            format: 'cjs',
            exports: 'named',
            name: 'mpAmplitudeKit',
            strict: false
        },
        plugins: [
            resolve({
                browser: true
            }),
            commonjs()
        ]
    }
]