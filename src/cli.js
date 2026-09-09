import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { MemoryStore, MockProvider, CompatibleProvider, runTurn, scoreCase, exportPreferences } from './core.js';

const json = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const persona = json('../config/persona.json');
const documents = json('../fixtures/knowledge.json');
const command = process.argv[2] ?? 'demo';
const live = command === 'chat' || process.argv.includes('--live');

async function main() {
  mkdirSync('artifacts', { recursive: true });
  if (command === 'export') {
    const input = process.argv[3] ?? 'fixtures/preferences.jsonl';
    const rows = readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const exported = exportPreferences(rows);
    writeFileSync('artifacts/preferences.jsonl', exported.map(row => JSON.stringify(row)).join('\n') + (exported.length ? '\n' : ''));
    console.log(`Exported ${exported.length} reviewed pairs to artifacts/preferences.jsonl`); return;
  }
  if (!['demo', 'chat', 'eval'].includes(command)) throw new Error('Use demo, chat, eval or export');
  const memory = new MemoryStore('data/memory');
  const provider = live ? new CompatibleProvider({ baseURL: process.env.LLM_BASE_URL, model: process.env.LLM_MODEL, apiKey: process.env.LLM_API_KEY }) : new MockProvider();
  const turn = (query, history = []) => runTurn({ query, user: 'local-demo', persona, documents, memory, provider, history });
  if (command === 'demo') {
    console.log(JSON.stringify(await turn('实验失败有点沮丧，DPO 的偏好数据应该怎么准备？'), null, 2)); return;
  }
  if (command === 'eval') {
    const results = [];
    for (const test of json('../fixtures/attacks.json')) {
      const output = await turn(test.prompt);
      results.push({ ...scoreCase(test, output.answer), ...output });
    }
    const report = { mode: live ? 'live' : 'mock', note: 'Keyword smoke checks only; not a validated capability or safety benchmark.', at: new Date().toISOString(), results };
    writeFileSync('artifacts/eval.json', JSON.stringify(report, null, 2));
    console.log(`${report.mode}: ${results.filter(r => r.passed).length}/${results.length} keyword checks; artifacts/eval.json`); return;
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  const history = [];
  console.log('Eidra Agent | /remember text | /memories | /forget | /quit');
  try {
    while (true) {
      const query = await terminal.question('You > ');
      if (query === '/quit') break;
      if (query === '/memories') { console.log(memory.list('local-demo')); continue; }
      if (query === '/forget') { memory.clear('local-demo'); console.log('Stored memories cleared.'); continue; }
      if (query.startsWith('/remember ')) { memory.remember('local-demo', query.slice(10)); continue; }
      if (!query.trim()) continue;
      const result = await turn(query, history);
      console.log(`${persona.name} > ${result.answer}`);
      console.log(`retrieved: ${result.evidence.map(doc => doc.id).join(', ')} | ${result.latencyMs} ms`);
      history.push({ role: 'user', content: query }, { role: 'assistant', content: result.answer });
      if (history.length > 12) history.splice(0, history.length - 12);
    }
  } finally { terminal.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
