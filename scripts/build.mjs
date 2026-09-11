import { access, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'src');
const output = resolve(root, 'dist');

// Check the entrypoint before replacing an existing build. Only dist/ is removed.
await access(resolve(source, 'index.html'));
await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

console.log('Built Little Sudoku: src/ → dist/');
