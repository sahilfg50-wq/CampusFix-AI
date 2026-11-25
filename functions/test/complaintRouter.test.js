import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRoute,
  buildSelfHelp,
  parseSelfHelp,
  buildEmails,
  buildAdminEmail,
  findGuide,
} from '../src/complaintRouter.js';
import { departmentEmail, ADMIN_EMAIL } from '../src/departments.js';

const base = {
  complaintId: 'CFX-2026-TEST01',
  building: 'Gargi Hostel',
  location: 'Room 214',
  reporter: 'Demo Student',
  studentEmail: 'student@campusfix.test',
  priority: 'Medium',
  sla: 'Within 24 hours',
};
const c = (title, description, category, extra = {}) => ({ ...base, title, description, category, department: 'IT & Network Cell', ...extra });

test('software problems go to self-help', () => {
  assert.equal(classifyRoute(c('Wi-Fi keeps disconnecting', 'My laptop wifi disconnects every 5 minutes in my room', 'Wi-Fi & IT')).route, 'self-help');
  assert.equal(classifyRoute(c('Forgot LMS password', 'I cannot log in to moodle, forgot my password', 'Wi-Fi & IT')).route, 'self-help');
});

test('portal outages go to the portal recovery agent', () => {
  assert.equal(classifyRoute(c('Student portal down', 'The ERP portal is not opening for anyone', 'Wi-Fi & IT')).route, 'portal');
});

test('physical problems go straight to the department', () => {
  assert.equal(classifyRoute(c('Fan not working', 'The ceiling fan in room 214 is not working', 'Electrical')).route, 'department');
  assert.equal(classifyRoute(c('Tap leaking', 'Bathroom tap leaking since morning', 'Plumbing')).route, 'department');
  assert.equal(classifyRoute(c('Router broken', 'The router broken on 2nd floor, cable cut too', 'Wi-Fi & IT')).route, 'department');
});

test('danger always becomes an emergency, whatever the category', () => {
  assert.equal(classifyRoute(c('Sparks from socket', 'Sparks and burning smell from the socket', 'Electrical')).route, 'emergency');
  assert.equal(classifyRoute(c('Wifi not working', 'Also there is a fire in the corridor', 'Wi-Fi & IT')).route, 'emergency');
  assert.equal(classifyRoute(c('Stranger in hostel', 'Unknown person roaming at night', 'Security & Safety')).route, 'emergency');
  assert.equal(classifyRoute(c('Help', 'Please check this soon', 'Other', { priority: 'Critical' })).route, 'emergency');
});

test('unclear complaints go to the admin', () => {
  assert.equal(classifyRoute(c('Request', 'I want to change my hostel room next semester', 'Other')).route, 'admin');
});

test('word matching is whole-word (rate is not rat, laptop is not tap)', () => {
  const r = classifyRoute(c('Internet rate very slow', 'Download rate on my laptop is slow everywhere', 'Wi-Fi & IT'));
  assert.equal(r.route, 'self-help');
});

test('built-in guides match the problem', () => {
  assert.equal(findGuide(c('Wi-Fi issue', 'internet not connecting', 'Wi-Fi & IT')).topic, 'wifi');
  assert.equal(findGuide(c('Login issue', 'forgot password for email', 'Wi-Fi & IT')).topic, 'password');
  assert.equal(findGuide(c('Random', 'something odd happened', 'Wi-Fi & IT')), null);
});

test('buildSelfHelp uses AI when it answers well, else the built-in guide', async () => {
  const complaint = c('Wi-Fi keeps disconnecting', 'wifi disconnects every few minutes', 'Wi-Fi & IT');
  const ai = await buildSelfHelp(complaint, {
    generate: async ({ prompt, schema }) => {
      assert.ok(prompt.includes('<<<Wi-Fi keeps disconnecting>>>'));
      assert.equal(schema.type, 'object');
      return JSON.stringify({ canSelfSolve: true, reason: 'Common', title: 'Reconnect', steps: ['Forget network', 'Reconnect'] });
    },
  });
  assert.equal(ai.source, 'ai');
  assert.deepEqual(ai.steps, ['Forget network', 'Reconnect']);

  let logged = false;
  const fallback = await buildSelfHelp(complaint, { generate: async () => 'garbage', log: () => { logged = true; } });
  assert.equal(fallback.source, 'rules');
  assert.ok(logged);
  assert.ok(fallback.steps.length >= 3);

  const none = await buildSelfHelp(c('Odd', 'something odd happened here', 'Wi-Fi & IT'));
  assert.equal(none.canSelfSolve, false);
});

test('AI can say a problem is not self-solvable', async () => {
  const r = await buildSelfHelp(c('Wifi', 'wifi down for whole block', 'Wi-Fi & IT'), {
    generate: async () => JSON.stringify({ canSelfSolve: false, reason: 'Whole block affected', title: '', steps: [] }),
  });
  assert.equal(r.canSelfSolve, false);
  assert.equal(r.source, 'ai');
});

test('parseSelfHelp rejects bad answers', () => {
  assert.throws(() => parseSelfHelp('nope'));
  assert.throws(() => parseSelfHelp(JSON.stringify({ steps: ['a', 'b'] })));
  assert.throws(() => parseSelfHelp(JSON.stringify({ canSelfSolve: true, steps: ['only one'] })));
  const long = parseSelfHelp(JSON.stringify({ canSelfSolve: true, reason: 'x', title: 't', steps: Array(10).fill('step') }));
  assert.equal(long.steps.length, 6);
});

test('department emails go to the right address with admin in cc', () => {
  const complaint = c('Fan not working', 'Ceiling fan stopped', 'Electrical', { department: 'Electrical Dept' });
  const [mail] = buildEmails(complaint, { route: 'department', reason: 'Needs electrician' });
  assert.equal(mail.to, departmentEmail('Electrical Dept'));
  assert.equal(mail.cc, ADMIN_EMAIL);
  assert.ok(mail.subject.includes('CFX-2026-TEST01'));
  assert.ok(mail.text.includes('Gargi Hostel, Room 214'));
  assert.ok(!mail.subject.startsWith('[URGENT]'));

  const [urgent] = buildEmails(complaint, { route: 'emergency', reason: 'Sparks' });
  assert.ok(urgent.subject.startsWith('[URGENT]'));
  assert.ok(urgent.text.includes('Priority: Critical'));
  assert.ok(urgent.text.includes('Target: Within 4 hours'));

  const admin = buildAdminEmail(complaint, 'Unclear');
  assert.equal(admin.to, ADMIN_EMAIL);
});

test('unknown department falls back to the admin address', () => {
  assert.equal(departmentEmail('Nope'), ADMIN_EMAIL);
});
