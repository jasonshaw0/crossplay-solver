export interface TrieNode { children: Map<number, number>; terminal: boolean; mask: number }
export interface DictionaryInfo { name: string; wordCount: number; additions: number; removals: number; fingerprint: string; rejected: number }
export interface Lexicon {
  words: Set<string>;
  nodes: TrieNode[];
  info: DictionaryInfo;
}
export function normalizeWords(text: string, maxLength = 15) {
  const words = new Set<string>();
  let rejected = 0;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const word = line.trim().toUpperCase();
    if (!word || word.startsWith('#')) continue;
    if (!/^[A-Z]+$/.test(word) || word.length < 2 || word.length > maxLength) { rejected++; continue; }
    words.add(word);
  }
  return { words, rejected };
}
export function buildLexicon(text: string, additions = '', removals = '', name = 'Custom dictionary', maxLength = 15): Lexicon {
  const normalized = normalizeWords(text, maxLength);
  const added = normalizeWords(additions, maxLength).words;
  const removed = normalizeWords(removals, maxLength).words;
  const words = normalized.words;
  let additionsCount = 0, removalsCount = 0;
  for (const word of added) { if (!words.has(word)) additionsCount++; words.add(word); }
  for (const word of removed) { if (words.delete(word)) removalsCount++; }
  if (!words.size) throw new Error('Dictionary unavailable. Solver cannot run until a dictionary is loaded.');
  const nodes: TrieNode[] = [{ children: new Map(), terminal: false, mask: 0 }];
  for (const word of words) {
    let index = 0;
    for (const character of word) {
      const letter = character.charCodeAt(0) - 65;
      let child = nodes[index].children.get(letter);
      if (child === undefined) {
        child = nodes.length;
        nodes[index].children.set(letter, child);
        nodes[index].mask |= 1 << letter;
        nodes.push({ children: new Map(), terminal: false, mask: 0 });
      }
      index = child;
    }
    nodes[index].terminal = true;
  }
  return { words, nodes, info: { name, wordCount: words.size, additions: additionsCount, removals: removalsCount, fingerprint: '', rejected: normalized.rejected } };
}
export async function fingerprintLexicon(lexicon: Lexicon) {
  const bytes = new TextEncoder().encode([...lexicon.words].sort().join('\n'));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  lexicon.info.fingerprint = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  return lexicon.info.fingerprint;
}
