const nodemailer = require('nodemailer');

const CALENDLY_URL = 'https://calendly.com/andreasnot-getaivy/30min';
const OWNER_EMAIL = process.env.NOTIFY_EMAIL || 'andreasnot@getaivy.info';

const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  website: 'Practice Website',
  industry: 'Specialty',
  time_in_business: 'Time in Business',
  team_size: 'Staff Size',
  monthly_revenue: 'Monthly Revenue',
  automation_features: 'Current Automation/CRM Features',
  bottleneck: 'Biggest Growth Bottleneck',
  first_name: 'First Name',
  last_name: 'Last Name',
  phone: 'Phone',
  calc_monthly: 'Calculator: $/month on the table',
  calc_annual: 'Calculator: $/year on the table',
  calc_hours: 'Calculator: hours/week back',
  calc_answers: 'Calculator answers',
};

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS2,
    },
  });
}

function firstName(fullName) {
  if (!fullName) return 'there';
  return String(fullName).trim().split(/\s+/)[0].slice(0, 40) || 'there';
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtHours(n) {
  const r = Math.round(n);
  return r + (r === 1 ? ' hour' : ' hours');
}

function ownerEmailText(formName, data) {
  const lines = Object.entries(data || {})
    .filter(([key]) => key !== 'bot-field' && key !== 'form-name')
    .map(([key, value]) => `${FIELD_LABELS[key] || key}: ${formatValue(value)}`);
  return `New submission on "${formName}":\n\n${lines.join('\n')}`;
}

function leadEmailText(name) {
  return `Hi ${name},

Thanks for telling us about your practice. We review every submission personally, and the next step is a free discovery call to talk through where your practice stands and where you want it to go.

Book your call here: ${CALENDLY_URL}

Talk soon,
Andreas — AIVY`;
}

function leadEmailHtml(name) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0F1F0D;">
      <p style="font-size:16px;">Hi ${escapeHtml(name)},</p>
      <p style="font-size:16px; line-height:1.6;">
        Thanks for telling us about your practice. We review every submission personally,
        and the next step is a free discovery call to talk through where your practice stands and where you want it to go.
      </p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${CALENDLY_URL}"
           style="background:#4DC831; color:#ffffff; text-decoration:none; font-weight:bold;
                  padding:14px 28px; border-radius:2px; display:inline-block; font-family: Arial, sans-serif;">
          Book Your Free Discovery Call
        </a>
      </p>
      <p style="font-size:14px; color:#4A6B45;">Or copy this link: ${CALENDLY_URL}</p>
      <p style="font-size:16px;">Talk soon,<br/>Andreas — AIVY</p>
    </div>
  `;
}

function calcNumbers(data) {
  const monthly = parseFloat(data.calc_monthly);
  const annual = parseFloat(data.calc_annual);
  const hours = parseFloat(data.calc_hours);
  const ok = [monthly, annual, hours].every(Number.isFinite) && monthly > 0;
  return { ok, monthly, annual, hours };
}

function calcLeadText(name, nums) {
  const results = nums.ok
    ? `Here's the breakdown you asked for, based on the answers you gave in the calculator:

  Left on the table:        about ${fmtMoney(nums.monthly)} a month (${fmtMoney(nums.annual)} a year)
  Time you could get back:  about ${fmtHours(nums.hours)} a week

These are estimates built from typical benchmarks for private practices. The discovery call is where we pressure-test them against your real numbers and show you where each dollar and hour is coming from.`
    : `Thanks for trying the "What Am I Leaving on the Table?" calculator. The numbers it shows are estimates built from typical benchmarks for private practices, and the discovery call is where we pressure-test them against your real numbers.`;

  return `Hi ${name},

${results}

If you'd like to walk through it together, pick a time here:
${CALENDLY_URL}

No pressure. It's a free conversation.

Andreas
AIVY`;
}

function calcLeadHtml(name, nums) {
  const stat = (label, value) => `
        <td style="padding:14px 18px; background:#F2FCF0; border-radius:3px; width:50%;">
          <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#4A6B45;">${label}</div>
          <div style="font-size:24px; font-weight:bold; color:#2D8A17; margin-top:4px;">${value}</div>
        </td>`;

  const results = nums.ok
    ? `
      <p style="font-size:16px; line-height:1.6;">Here's the breakdown you asked for, based on the answers you gave in the calculator:</p>
      <table role="presentation" cellspacing="8" cellpadding="0" style="width:100%; margin:8px -8px 16px;">
        <tr>
          ${stat('Left on the table', `~${fmtMoney(nums.monthly)}/mo`)}
          ${stat('Time you could get back', `~${fmtHours(nums.hours)}/wk`)}
        </tr>
      </table>
      <p style="font-size:14px; line-height:1.6; color:#4A6B45;">
        About ${fmtMoney(nums.annual)} a year. These are estimates built from typical benchmarks for private practices.
        The discovery call is where we pressure-test them against your real numbers and show you where each dollar and hour is coming from.
      </p>`
    : `
      <p style="font-size:16px; line-height:1.6;">
        Thanks for trying the "What Am I Leaving on the Table?" calculator. The numbers it shows are estimates built from
        typical benchmarks for private practices, and the discovery call is where we pressure-test them against your real numbers.
      </p>`;

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0F1F0D;">
      <p style="font-size:16px;">Hi ${escapeHtml(name)},</p>
      ${results}
      <p style="font-size:16px; line-height:1.6;">If you'd like to walk through it together, pick a time:</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${CALENDLY_URL}"
           style="background:#4DC831; color:#ffffff; text-decoration:none; font-weight:bold;
                  padding:14px 28px; border-radius:2px; display:inline-block; font-family: Arial, sans-serif;">
          Book a Free Discovery Call
        </a>
      </p>
      <p style="font-size:14px; color:#4A6B45;">No pressure. It's a free conversation.</p>
      <p style="font-size:16px;">Andreas<br/>AIVY</p>
    </div>
  `;
}

exports.handler = async (event) => {
  let payload;
  try {
    ({ payload } = JSON.parse(event.body || '{}'));
  } catch (err) {
    console.error('submission-created: could not parse event body', err);
    return { statusCode: 200, body: 'bad payload' };
  }

  const formName = payload && payload.form_name;
  const data = (payload && payload.data) || {};

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS2) {
    console.error('submission-created: SMTP env vars not configured, skipping email send.');
    return { statusCode: 200, body: 'skipped (no SMTP config)' };
  }

  const transporter = buildTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const leadFrom = `"Andreas at AIVY" <${fromAddress}>`;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: OWNER_EMAIL,
      replyTo: isEmail(data.email) ? data.email : undefined,
      subject: `New ${formName} submission`,
      text: ownerEmailText(formName, data),
    });
  } catch (err) {
    console.error('submission-created: failed to send owner notification', err);
  }

  if (formName === 'free-audit' && isEmail(data.email)) {
    try {
      await transporter.sendMail({
        from: leadFrom,
        to: data.email,
        replyTo: fromAddress,
        subject: 'Your Free Discovery Call — Pick a Time',
        text: leadEmailText(firstName(data.name)),
        html: leadEmailHtml(firstName(data.name)),
      });
    } catch (err) {
      console.error('submission-created: failed to send lead confirmation', err);
    }
  }

  if (formName === 'revenue-calculator-leads' && isEmail(data.email)) {
    const name = firstName(data.first_name);
    const nums = calcNumbers(data);
    try {
      await transporter.sendMail({
        from: leadFrom,
        to: data.email,
        replyTo: fromAddress,
        subject: 'Your breakdown: what you might be leaving on the table',
        text: calcLeadText(name, nums),
        html: calcLeadHtml(name, nums),
      });
    } catch (err) {
      console.error('submission-created: failed to send calculator breakdown', err);
    }
  }

  return { statusCode: 200, body: 'ok' };
};
