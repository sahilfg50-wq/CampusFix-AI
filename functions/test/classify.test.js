import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyComplaint, mergeWithAi, autoClassify, autoTitle, higherPriority } from '../src/classify.js';
import { classifyRoute } from '../src/complaintRouter.js';
import { CATEGORIES, DEPARTMENTS, PRIORITIES } from '../src/constants.js';

const c = (description, title = '') => classifyComplaint({ title, description });

test('common complaints are categorised automatically', () => {
  const cases = [
    ['Wi-Fi keeps disconnecting in my room since yesterday', 'Wi-Fi & IT', 'IT & Network Cell'],
    ['Internet is very slow on the 3rd floor', 'Wi-Fi & IT', 'IT & Network Cell'],
    ['net nahi chal raha room mein', 'Wi-Fi & IT', 'IT & Network Cell'],
    ['The student portal is not opening', 'Wi-Fi & IT', 'IT & Network Cell'],
    ['Projector in classroom 204 is not working', 'Wi-Fi & IT', 'IT & Network Cell'],
    ['No electricity in our wing since morning', 'Electrical', 'Electrical Dept'],
    ['Ceiling fan in room 12 stopped working', 'Electrical', 'Electrical Dept'],
    ['bijli nahi hai hostel mein', 'Electrical', 'Electrical Dept'],
    ['Tap in the 2nd floor washroom is leaking', 'Plumbing', 'Civil & Plumbing'],
    ['pani nahi aa raha bathroom mein', 'Plumbing', 'Civil & Plumbing'],
    ['Drinking water cooler is not cold', 'Plumbing', 'Civil & Plumbing'],
    ['Bench in classroom 101 is broken', 'Furniture & Infrastructure', 'Estate & Furniture'],
    ['My hostel room door lock is broken', 'Furniture & Infrastructure', 'Estate & Furniture'],
    ['Whiteboard in the lecture hall is damaged', 'Furniture & Infrastructure', 'Estate & Furniture'],
    ['Corridor is dirty and the dustbin is overflowing', 'Housekeeping', 'Sanitation Services'],
    ['Cockroaches in the hostel room', 'Housekeeping', 'Sanitation Services'],
    ['Mess food was stale today at lunch', 'Mess & Dining', 'Mess Committee'],
    ['Found hair in food in the mess hall', 'Mess & Dining', 'Mess Committee'],
    ['A stranger was roaming in the girls hostel at night', 'Security & Safety', 'Campus Security'],
  ];
  for (const [text, category, department] of cases) {
    const r = c(text);
    assert.equal(r.category, category, `"${text}" -> ${r.category}`);
    assert.equal(r.department, department, `"${text}" -> ${r.department}`);
    assert.equal(r.needsAdminReview, false);
  }
});

test('every result fits the Firestore rules', () => {
  for (const text of ['Wifi down', 'random words here', 'fire in the lab', 'tap leaking', 'please help me']) {
    const r = c(text);
    assert.ok(CATEGORIES.includes(r.category) && DEPARTMENTS.includes(r.department) && PRIORITIES.includes(r.priority));
    assert.ok(r.aiNote.length <= 300 && r.sla.length <= 60);
  }
});

test('unclear complaints go to admin review instead of asking for a category', () => {
  for (const text of ['I have a problem please help me', 'I want to change my room next semester', 'Something is wrong here since Monday']) {
    const r = c(text);
    assert.equal(r.category, 'Other', text);
    assert.equal(r.needsAdminReview, true);
    assert.equal(classifyRoute({ ...r, title: '', description: text }).route, 'admin', text);
  }
});

test('priorities: emergency, high impact, minor, normal', () => {
  assert.equal(c('Sparks and burning smell from the socket').priority, 'Critical');
  assert.equal(c('Sparks and burning smell from the socket').category, 'Electrical');
  assert.equal(c('There is a fire in the corridor').category, 'Security & Safety');
  assert.equal(c('Someone got an electric shock from the switch').priority, 'Critical');
  assert.equal(c('Many students have food poisoning after dinner').priority, 'Critical');
  assert.equal(c('Senior students are ragging juniors').priority, 'Critical');
  assert.equal(c('No water in the whole hostel').priority, 'High');
  assert.equal(c('Power cut in block B').priority, 'High');
  assert.equal(c('Small scratch and paint coming off the cupboard').priority, 'Low');
  assert.equal(c('Ceiling fan is making noise').priority, 'Medium');
  assert.equal(c('Not urgent: the curtain rod is loose').priority, 'Low', '"not urgent" must not raise priority');
  assert.equal(c('Please request help, the tap is leaking').priority, 'High', 'polite words must not lower priority');
});

test('danger without a clear category is still a safety complaint, never unclear', () => {
  const r = c('Help, someone is injured here');
  assert.equal(r.priority, 'Critical');
  assert.equal(r.category, 'Security & Safety');
  assert.equal(r.needsAdminReview, false);
});

test('word matching is whole-word', () => {
  assert.notEqual(c('The download rate is slow on my laptop').category, 'Housekeeping', 'rate is not rat');
  assert.equal(c('fantastic food, but the bench is broken').priority, 'Medium');
});

test('rule results route the same way as before', () => {
  const route = (text) => classifyRoute({ ...c(text), title: '', description: text }).route;
  assert.equal(route('Wi-Fi keeps disconnecting in my room'), 'self-help');
  assert.equal(route('The student portal is not opening'), 'portal');
  assert.equal(route('Tap in the washroom is leaking'), 'department');
  assert.equal(route('Sparks from the socket near my bed'), 'emergency');
  assert.equal(route('Unknown person in the hostel at night'), 'emergency');
});

test('AI can never lower the priority', () => {
  const rules = c('Sparks and burning smell from the socket');
  const merged = mergeWithAi(rules, { category: 'Furniture & Infrastructure', priority: 'Low', department: 'Estate & Furniture', aiNote: 'x', provider: 'Gemini AI' });
  assert.equal(merged.priority, 'Critical');
  assert.equal(merged.category, 'Electrical', 'emergencies keep the rule category');
  assert.equal(merged.department, 'Electrical Dept');
  assert.equal(merged.source, 'ai');

  const normal = c('Ceiling fan is making noise');
  assert.equal(mergeWithAi(normal, { category: 'Electrical', priority: 'High', department: 'Electrical Dept', aiNote: 'y' }).priority, 'High', 'AI may raise it');
  assert.equal(mergeWithAi(normal, { category: 'Electrical', priority: 'Low', department: 'Electrical Dept', aiNote: 'y' }).priority, 'Medium', 'but not lower it');
});

test('AI can correct a category, and an AI "Other" does not override a clear rule match', () => {
  const rules = c('My laptop charger socket is loose');
  const ai = mergeWithAi(rules, { category: 'Electrical', priority: 'Medium', department: 'Electrical Dept', aiNote: 'note' });
  assert.equal(ai.category, 'Electrical');

  const tap = c('Tap in the washroom is leaking');
  const keep = mergeWithAi(tap, { category: 'Other', priority: 'Medium', department: 'Estate & Furniture', aiNote: 'n' });
  assert.equal(keep.category, 'Plumbing');

  const unclear = c('I have a problem please help me');
  const both = mergeWithAi(unclear, { category: 'Other', priority: 'Low', department: 'Estate & Furniture', aiNote: 'n' });
  assert.equal(both.needsAdminReview, true);
});

test('invalid AI answers are ignored', () => {
  const rules = c('Tap in the washroom is leaking');
  for (const bad of [null, {}, { category: 'Hacker', priority: 'Critical' }, { category: 'Plumbing', priority: 'Urgent!!' }]) {
    const r = mergeWithAi(rules, bad);
    assert.equal(r.source, 'rules');
    assert.equal(r.category, 'Plumbing');
  }
  const badDept = mergeWithAi(c('Fan not working'), { category: 'Electrical', priority: 'Medium', department: 'Nope', aiNote: 'n' });
  assert.equal(badDept.department, 'Electrical Dept');
});

test('autoClassify works without AI, with AI, and when AI fails or is slow', async () => {
  const input = { title: 'Fan', description: 'The ceiling fan in my room stopped working' };

  const none = await autoClassify(input);
  assert.equal(none.source, 'rules');
  assert.equal(none.category, 'Electrical');

  const withAi = await autoClassify(input, {
    aiAnalyze: async () => ({ category: 'Electrical', priority: 'High', department: 'Electrical Dept', aiNote: 'Gemini analysis: fan', provider: 'Gemini AI' }),
  });
  assert.equal(withAi.source, 'ai');
  assert.equal(withAi.priority, 'High');
  assert.equal(withAi.provider, 'Gemini AI');

  const failed = await autoClassify(input, { aiAnalyze: async () => { throw Object.assign(new Error('No AI provider is configured.'), { code: 'functions/failed-precondition' }); } });
  assert.equal(failed.source, 'rules');
  assert.equal(failed.category, 'Electrical');

  const slow = await autoClassify(input, { aiAnalyze: () => new Promise(() => {}), timeoutMs: 50 });
  assert.equal(slow.source, 'rules');
});

test('autoTitle makes a valid title from the description', () => {
  assert.equal(autoTitle('wifi not working in my room. it started yesterday'), 'Wifi not working in my room');
  const long = autoTitle('x'.repeat(30) + ' ' + 'word '.repeat(40));
  assert.ok(long.length >= 5 && long.length <= 120);
  assert.ok(autoTitle('Tap leak!!! please fix').length >= 5);
});

test('higherPriority', () => {
  assert.equal(higherPriority('Low', 'Critical'), 'Critical');
  assert.equal(higherPriority('High', 'Medium'), 'High');
  assert.equal(higherPriority('Medium', 'nonsense'), 'Medium');
});
