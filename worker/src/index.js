// Receives founding pack requests from refuge.club and sends two emails through Resend:
// the pack to the requester, and a notification to the team.

const FORMS = ['Not sure yet', 'Estate Partner', 'Founding Partner', 'Member'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'body' }, 400, cors); }

    // Honeypot: bots fill the hidden field, people don't. Pretend it worked.
    if (body.website) return json({ ok: true }, 200, cors);

    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const interest = FORMS.includes(body.interest) ? body.interest : 'Not sure yet';
    const message = clean(body.message, 2000);
    if (!name || !EMAIL.test(email)) return json({ ok: false, error: 'fields' }, 422, cors);

    const first = name.split(' ')[0];
    const pack = packEmail(first, env);

    const results = await Promise.all([
      send(env, {
        from: env.FROM,
        to: [email],
        reply_to: env.REPLY_TO,
        subject: 'Your Refuge founding pack',
        html: pack.html,
        text: pack.text,
      }),
      send(env, {
        from: env.FROM,
        to: [env.NOTIFY_TO],
        reply_to: email,
        subject: `Founding pack request — ${name} (${interest})`,
        text: `Name: ${name}\nEmail: ${email}\nInterested in: ${interest}\n\n${message || '(no note)'}\n\nThe pack has been sent. Reply to this email to write to them directly.`,
      }),
    ]);

    // The requester's email is the one that matters; a failed notification shouldn't fail the form.
    if (!results[0]) return json({ ok: false, error: 'send' }, 502, cors);
    return json({ ok: true }, 200, cors);
  },
};

async function send(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.log('resend error', res.status, await res.text());
  return res.ok;
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function packEmail(first, env) {
  const text = [
    `Dear ${first},`,
    '',
    'Thank you for asking about Refuge. Here is the founding pack:',
    '',
    `Read online: ${env.PACK_URL}`,
    `PDF: ${env.PDF_URL}`,
    '',
    "It opens with why we are building Refuge, then covers the estate, what each family gets, how ownership works, the numbers and the risks. Start with 'Why Refuge'.",
    '',
    'I will be in touch personally within one working day to arrange a 30-minute introduction call. If you would like to pick a time now, just reply with a couple that suit you.',
    '',
    'Dan Barnes',
    'Founder, Refuge',
    'Near Saint-Émilion, Bordeaux · refuge.club',
  ].join('\n');

  const serif = "'EB Garamond', Georgia, 'Times New Roman', serif";
  const p = (t, extra = '') => `<p style="margin:0 0 18px;font-family:${serif};font-size:18px;line-height:1.6;color:#1C1A17;${extra}">${t}</p>`;
  const html = `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your Refuge founding pack</title></head>
<body style="margin:0;padding:0;background:#F7F4EE;">
<div style="display:none;max-height:0;overflow:hidden;">Why Refuge, the estate, the three forms, how ownership works, the numbers and the risks.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;">
<tr><td align="center" style="padding:48px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding-bottom:36px;border-bottom:1px solid #A98E5B;">
  <div style="font-family:${serif};font-size:22px;letter-spacing:0.12em;color:#1C1A17;">REFUGE</div>
  <div style="font-family:${serif};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#5C564D;margin-top:10px;">Near Saint-Émilion · Bordeaux</div>
</td></tr>
<tr><td style="padding-top:36px;">
  ${p(`Dear ${esc(first)},`)}
  ${p('Thank you for asking about Refuge. Your founding pack is ready.')}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;"><tr><td style="background:#5E1A24;border-radius:2px;">
    <a href="${env.PACK_URL}" style="display:inline-block;padding:16px 34px;font-family:${serif};font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#F7F4EE;text-decoration:none;">Read the founding pack</a>
  </td></tr></table>
  ${p(`It opens with why we are building Refuge, then covers the estate, what each family gets, how ownership works, the numbers and the risks. Start with <em>Why Refuge</em>. There is also a <a href="${env.PDF_URL}" style="color:#5E1A24;">PDF version</a> to keep.`)}
  ${p('I will be in touch personally within one working day to arrange a 30-minute introduction call. If you would like to pick a time now, just reply with a couple that suit you.')}
  ${p('Dan Barnes<br><span style="color:#5C564D;font-style:italic;">Founder, Refuge</span>', 'margin-top:28px;')}
</td></tr>
<tr><td align="center" style="padding-top:28px;border-top:1px solid #A98E5B;font-family:${serif};font-size:13px;color:#5C564D;">
  refuge.club · hello@refuge.club
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { html, text };
}
