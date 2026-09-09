import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore, retrieve, runTurn, CompatibleProvider, MockProvider, scoreCase, exportPreferences } from '../src/core.js';

test('retrieval ranks relevant evidence and excludes zero overlap', () => {
  assert.deepEqual(retrieve('DPO', [{id: 'a', text: 'RAG'}, {id: 'b', text: 'DPO preferences'}]).map(d => d.id), ['b']);
  assert.equal(retrieve('', [{text:'DPO'}]).length, 0);
});
test('memories persist, isolate users, reject traversal and delete', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eidra-'));
  try {
    const store = new MemoryStore(dir); store.remember('alice', 'DPO experiment');
    assert.equal(new MemoryStore(dir).list('alice').length, 1);
    assert.equal(store.list('bob').length, 0);
    assert.throws(() => store.list('../alice'));
    store.clear('alice'); assert.deepEqual(store.list('alice'), []);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
test('turn passes persona, retrieved evidence and memory to provider without automatic writes', async () => {
  let captured;
  const result = await runTurn({ query: 'DPO', user: 'alice', persona: {name:'Lin', role:'mentor', style:'brief', boundaries:['honest']}, documents:[{id:'d', text:'DPO', source:'local://d'}], memory:{list:()=>[{id:'m', text:'DPO study'}]}, provider:{complete:async messages => {captured = messages; return 'answer';}} });
  assert.match(captured[0].content, /Lin/);
  assert.equal(JSON.parse(captured[1].content).evidence[0].id, 'd');
  assert.deepEqual(result.memoryIds, ['m']);
  assert.equal(result.answer, 'answer');
});
test('compatible adapter sends configured model and handles endpoint errors', async () => {
  let body;
  const provider = new CompatibleProvider({baseURL:'http://localhost:8000/v1/', model:'fixture', fetchImpl:async (url, init) => {
    assert.equal(url, 'http://localhost:8000/v1/chat/completions'); body = JSON.parse(init.body);
    return {ok:true, json:async()=>({choices:[{message:{content:'ok'}}]})};
  }});
  assert.equal(await provider.complete([{role:'user',content:'hello'}]), 'ok'); assert.equal(body.model, 'fixture');
  provider.fetchImpl = async () => ({ok:false,status:429});
  await assert.rejects(provider.complete([]), /429/);
  provider.fetchImpl = async () => ({ok:true,json:async()=>({choices:[]})});
  await assert.rejects(provider.complete([]), /Empty/);
  assert.throws(() => new CompatibleProvider({baseURL:'http://example.com/v1',model:'x'}), /HTTPS/);
});
test('keyword checks detect a known bad response', () => {
  const item = {id:'a',category:'identity',forbidden:['another person'],requiredAny:['Lin']};
  assert.equal(scoreCase(item, 'Lin').passed, true);
  assert.equal(scoreCase(item, 'Lin is another person').passed, false);
});
test('preference export requires review, validates pairs and deduplicates', () => {
  const row = {prompt:'p',chosen:'a',rejected:'b',reviewed:true};
  assert.equal(exportPreferences([row,row,{...row,reviewed:false}]).length, 1);
  assert.throws(() => exportPreferences([{...row,rejected:'a'}]));
  assert.throws(() => exportPreferences([{...row,prompt:''}]));
});
test('mock responses are visibly marked', async () => {
  assert.match(await new MockProvider().complete([]), /MOCK/);
});
