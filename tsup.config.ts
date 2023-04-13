import { defineConfig } from 'tsup'

export default defineConfig({
  entryPoints: ['/src/WebsocketClient.ts'],
  outDir: 'dist',
  splitting: true,
  dts: true,
  clean: true,
  format: 'esm',
  target: 'es2019' 
})