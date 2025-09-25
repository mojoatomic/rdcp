import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

const external = ['crypto', 'node:crypto', 'jsonwebtoken', 'node-fetch', 'express', 'fastify']

const baseConfig = {
  external,
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    typescript({ 
      tsconfig: './tsconfig.json', 
      declaration: false,
      declarationMap: false 
    }),
  ],
}

export default [
  // Main SDK bundle
  {
    ...baseConfig,
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
  
  // Client SDK bundle
  {
    ...baseConfig,
    input: 'src/client/index.ts',
    output: [
      {
        file: 'dist/client/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/client/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
  
  // Server SDK bundle
  {
    ...baseConfig,
    input: 'src/server/index.ts',
    output: [
      {
        file: 'dist/server/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/server/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
  
  // Auth bundle
  {
    ...baseConfig,
    input: 'src/auth/index.ts',
    output: [
      {
        file: 'dist/auth/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/auth/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },

]
