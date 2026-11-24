import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeComplaint, validateInput, parseModelOutput, clip, AppError } from '../src/analyze.js';
import { CATEGORIES, DEPARTMENTS, PRIORITIES } from '../src/constants.js';

const good = { category: 'Electrical', priority: 'Critical', department: 'Electrical Dept', analysis: 'Sparking socket is a fire risk.', suggestedAction: 'Cut power and send an electrician now.' };
const deps = (over = {}) => ({ checkRateLimit: async () => {}, generate: async () => JSON.stringify(good), ...over });
const data = { title: 'Sparks from socket', description: 'Sparks coming from the lab socket today' };
const rejects = (p, code) => assert.rejects(p, (e) => e instanceof AppError && e.code === code);

test('valid answer passes and values fit Firestore rules', async () => {
  const r = await analyzeComplaint({ data, uid: 'u1', deps: deps() });
  assert.ok(CATEGORIES.includes(r.category) && PRIORITIES.includes(r.priority) && DEPARTMENTS.includes(r.department));
  assert.ok(r.aiNote.length <= 300 && r.sla.length <= 60);
  assert.ok(r.aiNote.startsWith('Gemini analysis: ') && r.aiNote.includes(' Suggested action: '));
  assert.deepEqual(Object.keys(r).sort(), ['aiNote', 'analysis', 'category', 'department', 'priority', 'sla', 'suggestedAction']);
});
test('logged-out request is rejected', () => rejects(analyzeComplaint({ data, uid: undefined, deps: deps() }), 'unauthenticated'));
test('bad input is rejected before Gemini is called', async () => {
  let called = false;
  const d = deps({ generate: async () => { called = true; return '{}'; } });
  for (const bad of [null, {}, { title: 1, description: 2 }, { title: 'abc', description: 'long enough description here' }, { title: 'Good title', description: 'short' }, { title: 'x'.repeat(121), description: 'long enough description here' }, { title: 'Good title', description: 'y'.repeat(2001) }]) {
    await rejects(analyzeComplaint({ data: bad, uid: 'u1', deps: d }), 'invalid-argument');
  }
  assert.equal(called, false);
});
test('rate limit error is passed through and Gemini is not called', async () => {
  const d = deps({ checkRateLimit: async () => { throw new AppError('resource-exhausted', 'slow down'); }, generate: async () => { throw new Error('should not run'); } });
  await rejects(analyzeComplaint({ data, uid: 'u1', deps: d }), 'resource-exhausted');
});
test('invalid category / priority / garbage are rejected', () => {
  for (const t of ['not json', '{}', JSON.stringify({ ...good, category: 'Admin' }), JSON.stringify({ ...good, priority: 'Urgent!!' }), JSON.stringify({ ...good, analysis: '' }), '']) {
    assert.throws(() => parseModelOutput(t), (e) => e instanceof AppError && e.code === 'unavailable');
  }
});
test('invalid department is repaired from category; case and code fences are tolerated', () => {
  const r = parseModelOutput('```json\n' + JSON.stringify({ ...good, department: 'Hacker Dept', priority: 'critical' }) + '\n```');
  assert.equal(r.department, 'Electrical Dept');
  assert.equal(r.priority, 'Critical');
});
test('prompt-injection style output cannot add fields such as role', () => {
  const r = parseModelOutput(JSON.stringify({ ...good, role: 'admin', status: 'Resolved', studentId: 'x' }));
  assert.equal(r.role, undefined); assert.equal(r.status, undefined); assert.equal(r.studentId, undefined);
});
test('long text is clipped so aiNote never exceeds 300 characters', () => {
  const r = parseModelOutput(JSON.stringify({ ...good, analysis: 'word '.repeat(200), suggestedAction: 'act '.repeat(200) }));
  assert.ok(r.analysis.length <= 130 && r.suggestedAction.length <= 130 && r.aiNote.length <= 300);
});
test('upstream errors are mapped to safe messages', async () => {
  for (const [status, code] of [[429, 'resource-exhausted'], [403, 'failed-precondition'], [500, 'unavailable'], [undefined, 'unavailable']]) {
    const d = deps({ generate: async () => { throw Object.assign(new Error('secret details'), { status }); } });
    await assert.rejects(analyzeComplaint({ data, uid: 'u1', deps: d }), (e) => e.code === code && !/secret details/.test(e.message));
  }
});
test('control characters are removed from input; clip helper', () => {
  assert.equal(validateInput({ title: 'Ti\u0000tle ok', description: 'Description is long enough' }).title, 'Title ok');
  assert.equal(clip('short', 10), 'short');
  assert.ok(clip('a b c d e f g h i j k l m n o p', 10).endsWith('…'));
});
