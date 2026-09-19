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
  return String(fullName).trim().split(/\s+/)[0];
}

function formatValue(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function ownerEmailText(formName, data) {
  const lines = Object.entries(data || {})
    .filter(([key]) => key !== 'bot-field' && key !== 'form-name')
    .map(([key, value]) => `${FIELD_LABELS[key] || key}: ${formatValue(value)}`);
  return `New submission on "${formName}":\n\n${lines.join('\n')}`;
}

function leadEmailText(name) {
  return `Hi ${name},

Thanks for telling us about your practice. We review every submission personally, and the next step is a quick call to walk through your free audit.

Book your call here: ${CALENDLY_URL}

Talk soon,
Andreas — AIVY`;
}

function leadEmailHtml(name) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0F1F0D;">
      <p style="font-size:16px;">Hi ${name},</p>
      <p style="font-size:16px; line-height:1.6;">
        Thanks for telling us about your practice. We review every submission personally,
        and the next step is a quick call to walk through your free audit.
      </p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${CALENDLY_URL}"
           style="background:#4DC831; color:#ffffff; text-decoration:none; font-weight:bold;
                  padding:14px 28px; border-radius:2px; display:inline-block; font-family: Arial, sans-serif;">
          Book Your Free Audit Call
        </a>
      </p>
      <p style="font-size:14px; color:#4A6B45;">Or copy this link: ${CALENDLY_URL}</p>
      <p style="font-size:16px;">Talk soon,<br/>Andreas — AIVY</p>
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

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: OWNER_EMAIL,
      replyTo: data.email || undefined,
      subject: `New ${formName} submission`,
      text: ownerEmailText(formName, data),
    });
  } catch (err) {
    console.error('submission-created: failed to send owner notification', err);
  }

  if (formName === 'free-audit' && data.email) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: data.email,
        subject: 'Your Free Practice Audit — Book Your Call',
        text: leadEmailText(firstName(data.name)),
        html: leadEmailHtml(firstName(data.name)),
      });
    } catch (err) {
      console.error('submission-created: failed to send lead confirmation', err);
    }
  }

  return { statusCode: 200, body: 'ok' };
};
