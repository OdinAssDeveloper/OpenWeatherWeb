import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
async function walk(dir, prefix = '') {
 const entries = await readdir(dir, { withFileTypes: true });
 const files = [];
 for (const entry of entries) {
   const name = prefix + entry.name;
   if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), name + '/'));
   else if (name !== 'sw.js') files.push(name);
 }
 return files.sort();
}
const files = await walk(dist);
const template = await readFile(path.join(root, 'scripts/sw-template.js'), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(file).update(await readFile(path.join(dist, file)));
const version = hash.digest('hex').slice(0, 16);
const worker = template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files));
await writeFile(path.join(dist, 'sw.js'), worker);
console.log('PWA service worker generated: ' + files.length + ' application assets.');
