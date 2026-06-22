import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

const CLIENT_DIRECTIVE = '"use client";\n';

async function emittedBundles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await emittedBundles(p)));
    else if (/\.(js|cjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  async onSuccess() {
    for (const file of await emittedBundles(join(process.cwd(), 'dist'))) {
      const code = await readFile(file, 'utf8');
      if (/^['"]use client['"]/.test(code)) continue;
      await writeFile(file, CLIENT_DIRECTIVE + code, 'utf8');
    }
  },
});
