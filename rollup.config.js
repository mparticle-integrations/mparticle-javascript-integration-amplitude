import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [{
    input: 'src/Amplitude.js',
    output: {
        file: 'Amplitude.js',
        format: 'umd',
        exports: 'named',
        name: 'mp-amplitude-kit',
        strict: false
    },
    plugins: [
        resolve({
            browser: true
        }),
        commonjs()
    ]},
    {
        input: 'src/Amplitude.js',
        output: {
            file: 'dist/Amplitude.js',
            format: 'umd',
            exports: 'named',
            name: 'mp-amplitude-kit',
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