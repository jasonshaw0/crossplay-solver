import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { normalizeWords } from '../src/lib/crossplay/dictionary';

await mkdir('public/dictionary', { recursive: true });
const source = gunzipSync(await readFile('public/dictionary/enable2k.txt.gz')).toString('utf8');
const additions = await readFile('config/dictionary-additions.txt', 'utf8');
const removals = await readFile('config/dictionary-removals.txt', 'utf8');
const { words } = normalizeWords(source);
const text = [...words].sort().join('\n') + '\n';
await writeFile('public/dictionary/words.txt', text);
await writeFile('public/dictionary/additions.txt', additions);
await writeFile('public/dictionary/removals.txt', removals);
await writeFile('public/dictionary/manifest.json', JSON.stringify({
  name: 'ENABLE 2K', wordCount: words.size, source: 'https://github.com/BartMassey/wordlists',
  license: 'Public domain', authoritativeForNYT: false, fingerprint: createHash('sha256').update(text).digest('hex'),
}, null, 2) + '\n');
console.log(`Prepared ${words.size.toLocaleString()} ENABLE words (2–15 letters).`);
