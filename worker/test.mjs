// Runs the Worker against a mocked Resend API. Usage: node test.mjs
import assert from 'node:assert/strict';
import worker from './src/index.js';

const env = {
  ALLOWED_ORIGIN: 'https://refuge.club',
  FROM: 'Dan Barnes <dan@refuge.club>',
  REPLY_TO: 'hello@refuge.club',
  NOTIFY_TO: 'hello@refuge.club',
  PACK_URL: 'https://refuge.club/founding-pack/',
  PDF_URL: 'https://refuge.club/founding-pack/refuge-founding-pack.pdf',
  RESEND_API_KEY: 're_test',
};

let sent = [];
let resendStatus = 200;
globalThis.fetch = async (url, init) => {
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers.Authorization, 'Bearer re_test');
  sent.push(JSON.parse(init.body));
  return new Response('{}', { status: resendStatus });
};
const post = body => worker.fetch(new Request('https://w.dev', { method: 'POST', body: JSON.stringify(body) }), env);

// A good request sends the pack and the notification
sent = [];
let res = await post({ name: 'Kelly <b>Smith</b>', email: 'k@x.com', interest: 'Estate Partner', message: 'Two kids' });
assert.equal(res.status, 200);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://refuge.club');
assert.equal(sent.length, 2);
const [pack, note] = sent;
assert.deepEqual(pack.to, ['k@x.com']);
assert.equal(pack.reply_to, 'hello@refuge.club');
assert.ok(pack.html.includes('https://refuge.club/founding-pack/'));
assert.ok(pack.html.includes('Dear Kelly,'));
assert.ok(!pack.html.includes('<b>'), 'name is escaped in HTML');
assert.ok(pack.text.includes('PDF: https://refuge.club/founding-pack/refuge-founding-pack.pdf'));
assert.equal(note.reply_to, 'k@x.com');
assert.ok(note.subject.includes('(Estate Partner)'));

// Unknown interest falls back
sent = [];
await post({ name: 'A', email: 'a@x.com', interest: 'Hacker' });
assert.ok(sent[1].subject.includes('(Not sure yet)'));

// Bad fields are rejected without sending
sent = [];
res = await post({ name: '', email: 'nope' });
assert.equal(res.status, 422);
assert.equal(sent.length, 0);

// Honeypot pretends to succeed and sends nothing
res = await post({ name: 'Bot', email: 'b@x.com', website: 'spam.com' });
assert.equal(res.status, 200);
assert.equal(sent.length, 0);

// Preflight and wrong method
res = await worker.fetch(new Request('https://w.dev', { method: 'OPTIONS' }), env);
assert.equal(res.status, 204);
res = await worker.fetch(new Request('https://w.dev'), env);
assert.equal(res.status, 405);

// Resend failure surfaces as 502 so the site shows the email fallback
resendStatus = 500;
const log = console.log; console.log = () => {};
res = await post({ name: 'K', email: 'k@x.com' });
console.log = log;
assert.equal(res.status, 502);

console.log('all worker tests passed');
