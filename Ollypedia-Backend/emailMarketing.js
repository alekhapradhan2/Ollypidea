/**
 * emailMarketing.js — Ollypedia Email Marketing Module
 *
 * Provider : Brevo (formerly Sendinblue) — 300 emails/day FREE
 * Transport: SMTP   smtp-relay.brevo.com : 587 (STARTTLS)
 * Library  : nodemailer
 * Queue    : node-cron polling every 30 seconds
 *
 * Mount in server.js (after mongoose.connect resolves):
 *   require('./emailMarketing')(app, mongoose, cron, adminAuth, SITE_URL);
 */
'use strict';

const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const axios      = require('axios');
const { parse: csvParse } = require('csv-parse/sync');

// ── Smart backend URL resolution for email click/open tracking links ───────────
// Prioritizes:
// 1. Explicit BACKEND_URL if not localhost
// 2. Render-provided RENDER_EXTERNAL_URL (e.g. https://ollipedia-backend.onrender.com)
// 3. Fallback to BACKEND_URL or local server
function resolveBackendUrl() {
  const envBackend = (process.env.BACKEND_URL || '').trim();
  if (envBackend && !envBackend.includes('localhost') && !envBackend.includes('127.0.0.1')) {
    return envBackend.replace(/\/+$/, '');
  }
  const renderUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
  if (renderUrl) {
    return renderUrl.replace(/\/+$/, '');
  }
  return (envBackend || ('http://localhost:' + (process.env.PORT || 4000))).replace(/\/+$/, '');
}

// ── Read config lazily so .env can be loaded after require() ────────────────
const cfg = () => {
  // Support BREVO_API_KEY directly, or if user put xkeysib-... inside BREVO_SMTP_KEY
  const apiKey = (process.env.BREVO_API_KEY || (process.env.BREVO_SMTP_KEY && process.env.BREVO_SMTP_KEY.startsWith('xkeysib-') ? process.env.BREVO_SMTP_KEY : '')).trim();
  return {
    apiKey,
    host:        process.env.BREVO_SMTP_HOST     || 'smtp-relay.brevo.com',
    port:        parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
    user:        (process.env.BREVO_SMTP_USER     || '').trim(),   // your Brevo account email
    pass:        (process.env.BREVO_SMTP_KEY      || '').trim(),   // SMTP Key from Brevo dashboard
    fromEmail:   (process.env.BREVO_FROM_EMAIL    || 'noreply@ollypedia.in').trim(),
    fromName:    (process.env.BREVO_FROM_NAME     || 'Ollypedia').trim(),
    unsubSecret: process.env.EMAIL_UNSUBSCRIBE_SECRET || 'change_me_unsub_32chars',
    trackSecret: process.env.EMAIL_TRACKING_SECRET    || 'change_me_track_32chars',
    backendUrl:  resolveBackendUrl(),
    batchSize:   parseInt(process.env.EMAIL_BATCH_SIZE     || '30',  10),
    batchDelay:  parseInt(process.env.EMAIL_BATCH_DELAY_MS || '500', 10),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
module.exports = function registerEmailMarketing(app, mongoose, cron, adminAuth, SITE_URL) {
  const Schema = mongoose.Schema;

  // ── SCHEMA: EmailSubscriber ────────────────────────────────────────────────
  const EmailSubscriberSchema = new Schema({
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:            { type: String, default: '' },
    firstName:       { type: String, default: '' },
    lastName:        { type: String, default: '' },
    status:          { type: String, enum: ['subscribed', 'unsubscribed', 'bounced'], default: 'subscribed' },
    source:          { type: String, enum: ['import', 'manual', 'community', 'registered'], default: 'manual' },
    subscribedAt:    { type: Date, default: Date.now },
    unsubscribedAt:  { type: Date, default: null },
    communityUserId: { type: Schema.Types.ObjectId, ref: 'CommunityUser', default: null },
    metadata:        { type: Schema.Types.Mixed, default: {} },
  }, { timestamps: true });
  EmailSubscriberSchema.index({ status: 1, source: 1 });
  EmailSubscriberSchema.index({ subscribedAt: -1 });
  const EmailSubscriber = mongoose.models.EmailSubscriber ||
    mongoose.model('EmailSubscriber', EmailSubscriberSchema, 'emailsubscribers');

  // ── SCHEMA: EmailTemplate ──────────────────────────────────────────────────
  const EmailTemplateSchema = new Schema({
    name:      { type: String, required: true, trim: true },
    subject:   { type: String, default: '' },
    html:      { type: String, required: true },
    variables: [{ type: String }],
    createdBy: { type: String, default: 'admin' },
  }, { timestamps: true });
  EmailTemplateSchema.index({ createdAt: -1 });
  const EmailTemplate = mongoose.models.EmailTemplate ||
    mongoose.model('EmailTemplate', EmailTemplateSchema, 'emailtemplates');

  // ── SCHEMA: EmailCampaign ──────────────────────────────────────────────────
  const EmailCampaignSchema = new Schema({
    name:              { type: String, required: true, trim: true },
    subject:           { type: String, required: true, trim: true },
    fromName:          { type: String, default: '' },
    fromEmail:         { type: String, default: '' },
    replyTo:           { type: String, default: '' },
    templateId:        { type: Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    status:            { type: String, enum: ['draft','scheduled','sending','sent','failed','cancelled'], default: 'draft' },
    recipientFilter:   { type: String, enum: ['all','community','imported','manual'], default: 'all' },
    manualRecipients:  [{ type: String }],
    recipientCount:    { type: Number, default: 0 },
    sentCount:         { type: Number, default: 0 },
    deliveredCount:    { type: Number, default: 0 },
    openedCount:       { type: Number, default: 0 },
    clickedCount:      { type: Number, default: 0 },
    bouncedCount:      { type: Number, default: 0 },
    unsubscribedCount: { type: Number, default: 0 },
    failedCount:       { type: Number, default: 0 },
    snapshotHtml:      { type: String, default: '' },
    snapshotSubject:   { type: String, default: '' },
    scheduledAt:       { type: Date, default: null },
    startedAt:         { type: Date, default: null },
    completedAt:       { type: Date, default: null },
  }, { timestamps: true });
  EmailCampaignSchema.index({ status: 1, createdAt: -1 });
  const EmailCampaign = mongoose.models.EmailCampaign ||
    mongoose.model('EmailCampaign', EmailCampaignSchema, 'emailcampaigns');

  // ── SCHEMA: EmailCampaignRecipient ─────────────────────────────────────────
  const EmailCampaignRecipientSchema = new Schema({
    campaignId:    { type: Schema.Types.ObjectId, ref: 'EmailCampaign', required: true, index: true },
    subscriberId:  { type: Schema.Types.ObjectId, ref: 'EmailSubscriber', default: null },
    email:         { type: String, required: true, lowercase: true },
    firstName:     { type: String, default: '' },
    lastName:      { type: String, default: '' },
    name:          { type: String, default: '' },
    status:        { type: String, enum: ['pending','sent','failed','bounced'], default: 'pending' },
    openToken:     { type: String, default: '' },
    clickToken:    { type: String, default: '' },
    providerMsgId: { type: String, default: '' },
    sentAt:        { type: Date, default: null },
    openedAt:      { type: Date, default: null },
    clickedAt:     { type: Date, default: null },
    bouncedAt:     { type: Date, default: null },
    error:         { type: String, default: '' },
    retries:       { type: Number, default: 0 },
  }, { timestamps: true });
  EmailCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
  EmailCampaignRecipientSchema.index({ openToken: 1 });
  EmailCampaignRecipientSchema.index({ clickToken: 1 });
  const EmailCampaignRecipient = mongoose.models.EmailCampaignRecipient ||
    mongoose.model('EmailCampaignRecipient', EmailCampaignRecipientSchema, 'emailcampaignrecipients');

  // ═══════════════════════════════════════════════════════════════════════════
  //  EMAIL SERVICE — Brevo HTTPS REST API (Port 443) & Brevo SMTP (Port 587)
  // ═══════════════════════════════════════════════════════════════════════════

  function createTransporter() {
    const c = cfg();
    if (!c.user || !c.pass) {
      throw new Error(
        'Brevo credentials are not configured. ' +
        'Set BREVO_API_KEY (for Render / production over HTTPS) or BREVO_SMTP_USER & BREVO_SMTP_KEY (for local dev).'
      );
    }
    return nodemailer.createTransport({
      host:   c.host,
      port:   c.port,
      secure: false,  // STARTTLS on 587
      auth:   { user: c.user, pass: c.pass },
      tls:    { rejectUnauthorized: false },
      connectionTimeout: 15000,
    });
  }

  // Send via Brevo v3 HTTPS REST API (Port 443 — reliable in cloud environments like Render)
  async function sendViaBrevoApi({ to, subject, html, fromName, fromEmail, replyTo, apiKey }) {
    const payload = {
      sender: {
        name:  fromName,
        email: fromEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      headers: { 'X-Mailer': 'Ollypedia Email Marketing v1.0' },
    };
    if (replyTo && replyTo.trim()) {
      payload.replyTo = { email: replyTo.trim() };
    }

    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 20000,
      });
      const data = response.data || {};
      const msgId = data.messageId || (Array.isArray(data.messageIds) ? data.messageIds[0] : 'brevo-api-ok');
      console.log(`[Email] Brevo REST API Dispatched -> ID: ${msgId}`);
      return { messageId: msgId, response: 'OK' };
    } catch (apiErr) {
      const respData = apiErr.response ? apiErr.response.data : null;
      let errMsg = apiErr.message;
      if (respData) {
        errMsg = typeof respData === 'object' ? (respData.message || JSON.stringify(respData)) : String(respData);
      }
      console.error(`[Email] Brevo REST API error (${apiErr.response ? apiErr.response.status : 'network'}):`, errMsg);
      throw new Error(`Brevo API error: ${errMsg}`);
    }
  }

  async function sendEmail({ to, subject, html, fromName, fromEmail, replyTo }) {
    const c = cfg();
    const fromAddr = fromEmail || c.fromEmail;
    const resolvedFromName = fromName || c.fromName;

    // ── Primary: Brevo HTTPS REST API (Port 443 — never blocked by Render / cloud firewalls) ──
    if (c.apiKey) {
      console.log(`[Email] Sending via Brevo REST API (HTTPS 443) -> To: ${to} | From: ${fromAddr} | Subject: "${subject}"`);
      return sendViaBrevoApi({
        to,
        subject,
        html,
        fromName:  resolvedFromName,
        fromEmail: fromAddr,
        replyTo,
        apiKey:    c.apiKey,
      });
    }

    // ── Secondary: Brevo SMTP (Port 587) ──
    if (process.env.RENDER_EXTERNAL_URL || process.env.RENDER) {
      console.warn('[Email] Warning: Render free tier blocks outbound SMTP ports (587, 465, 25). Set BREVO_API_KEY (xkeysib-...) in Render environment variables to send over HTTPS port 443.');
    }
    const transport = createTransporter();
    console.log(`[Email] Sending via Brevo SMTP (Port ${c.port}) -> To: ${to} | From: ${fromAddr} | Subject: "${subject}"`);
    const info = await transport.sendMail({
      from:    '"' + resolvedFromName + '" <' + fromAddr + '>',
      to, subject, html,
      ...(replyTo ? { replyTo } : {}),
      headers: { 'X-Mailer': 'Ollypedia Email Marketing v1.0' },
    });
    console.log(`[Email] Brevo SMTP Dispatched -> ID: ${info.messageId} | Response: ${info.response || 'OK'}`);
    return info;
  }

  /** Replace {{variable}} tokens — never leaks unresolved placeholders */
  function replaceVars(html, data) {
    const fn = data.firstName || (data.name || '').split(' ')[0] || 'there';
    const ln = data.lastName  || (data.name || '').split(' ').slice(1).join(' ') || '';
    const nm = data.name || (fn + (ln ? ' ' + ln : '')).trim();
    return html
      .replace(/\{\{firstName\}\}/gi,      fn)
      .replace(/\{\{lastName\}\}/gi,       ln)
      .replace(/\{\{name\}\}/gi,           nm)
      .replace(/\{\{email\}\}/gi,          data.email || '')
      .replace(/\{\{unsubscribeUrl\}\}/gi, data.unsubscribeUrl || '#')
      .replace(/\{\{websiteUrl\}\}/gi,     'https://www.ollypedia.in')
      .replace(/\{\{[^}]+\}\}/g, '');
  }

  /** CAN-SPAM / GDPR compliant unsubscribe footer with official Ollypedia styling */
  function addFooter(html, unsubUrl) {
    const footer = [
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #2a2a2a;background:#0a0a0a;">',
      '<tr><td style="padding:24px 20px;text-align:center;font-family:\'DM Sans\',-apple-system,sans-serif;font-size:12px;color:#888070;">',
      '<p style="margin:0 0 10px;color:#888070;">You received this email because you subscribed to updates on Ollypedia.</p>',
      '<p style="margin:0;">',
      '<a href="https://www.ollypedia.in/" style="color:#c9973a;text-decoration:none;font-weight:600;">Home</a> &bull; ',
      '<a href="https://www.ollypedia.in/movies" style="color:#c9973a;text-decoration:none;font-weight:600;">Movies</a> &bull; ',
      '<a href="https://www.ollypedia.in/community" style="color:#c9973a;text-decoration:none;font-weight:600;">Community</a> &bull; ',
      '<a href="https://www.ollypedia.in/boxoffice" style="color:#c9973a;text-decoration:none;font-weight:600;">Box Office</a> &bull; ',
      '<a href="' + unsubUrl + '" style="color:#888070;text-decoration:underline;">Unsubscribe</a>',
      '</p>',
      '</td></tr></table>',
    ].join('');
    return html.toLowerCase().includes('</body>')
      ? html.replace(/<\/body>/i, footer + '</body>')
      : html + footer;
  }

  /** HMAC-SHA256 token for secure unsubscribe / tracking URLs */
  function makeToken(data, secret) {
    return crypto.createHmac('sha256', secret || 'fallback_key')
      .update(String(data))
      .digest('base64url')
      .slice(0, 40);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BACKGROUND CAMPAIGN QUEUE  (node-cron, every 30 seconds)
  // ═══════════════════════════════════════════════════════════════════════════

  let queueBusy = false;

  async function runQueue() {
    if (queueBusy) return;
    queueBusy = true;
    try {
      const campaigns = await EmailCampaign.find({ status: 'sending' }).lean();

      for (const campaign of campaigns) {
        // Refresh — may have been cancelled since last tick
        const live = await EmailCampaign.findById(campaign._id).select('status').lean();
        if (!live || live.status !== 'sending') continue;

        const c = cfg();
        const batch = await EmailCampaignRecipient.find({
          campaignId: campaign._id, status: 'pending', retries: { $lt: 3 },
        }).limit(c.batchSize).lean();

        if (batch.length === 0) {
          // All recipients processed — mark campaign complete
          const [sentN, failedN] = await Promise.all([
            EmailCampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'sent' }),
            EmailCampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'failed' }),
          ]);
          await EmailCampaign.findByIdAndUpdate(campaign._id, {
            status: 'sent', completedAt: new Date(), sentCount: sentN, failedCount: failedN,
          });
          console.log('[EmailQueue] Complete: "' + campaign.name + '" Sent:' + sentN + ' Failed:' + failedN);
          continue;
        }

        console.log('[EmailQueue] Batch of ' + batch.length + ' for "' + campaign.name + '"');

        for (const r of batch) {
          // Per-email cancel check
          const chk = await EmailCampaign.findById(campaign._id).select('status').lean();
          if (!chk || chk.status === 'cancelled') break;

          try {
            const openToken  = r.openToken  || makeToken('open:'  + r._id + ':' + campaign._id, c.trackSecret);
            const clickToken = r.clickToken || makeToken('click:' + r._id + ':' + campaign._id, c.trackSecret);
            const unsubToken = makeToken('unsub:' + r._id + ':' + campaign._id, c.unsubSecret);
            const unsubUrl   = c.backendUrl + '/unsubscribe?token=' + unsubToken + '&rid=' + r._id;
            const openUrl    = c.backendUrl + '/api/email/track/open/' + openToken;

            let html = replaceVars(campaign.snapshotHtml || '', {
              firstName: r.firstName, lastName: r.lastName, name: r.name,
              email: r.email, unsubscribeUrl: unsubUrl,
            });

            // Inject 1×1 open-tracking pixel
            const pixel = '<img src="' + openUrl + '" width="1" height="1" border="0" style="display:none;" alt="" />';
            html = html.toLowerCase().includes('</body>') ? html.replace(/<\/body>/i, pixel + '</body>') : html + pixel;
            html = addFooter(html, unsubUrl);

            // Rewrite hyperlinks for click tracking (excluding anchor links and unsubscribe links)
            html = html.replace(/<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (match, before, quote, href, after) => {
              if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('/unsubscribe')) {
                return match;
              }
              const trackUrl = c.backendUrl + '/api/email/track/click/' + clickToken + '?url=' + encodeURIComponent(href);
              return '<a ' + before + 'href="' + trackUrl + '"' + after + '>';
            });

            const info = await sendEmail({
              to: r.email,
              subject:   campaign.snapshotSubject || campaign.subject,
              html,
              fromName:  campaign.fromName  || c.fromName,
              fromEmail: campaign.fromEmail || c.fromEmail,
              replyTo:   campaign.replyTo,
            });

            await EmailCampaignRecipient.findByIdAndUpdate(r._id, {
              status: 'sent', sentAt: new Date(),
              openToken, clickToken, providerMsgId: info && info.messageId ? info.messageId : '',
            });
            await EmailCampaign.findByIdAndUpdate(campaign._id, { $inc: { sentCount: 1 } });
            console.log('[EmailQueue] Sent -> ' + r.email);

          } catch (err) {
            const nr = (r.retries || 0) + 1;
            const done = nr >= 3;
            await EmailCampaignRecipient.findByIdAndUpdate(r._id, {
              retries: nr, status: done ? 'failed' : 'pending',
              error: String(err.message || '').slice(0, 300),
            });
            if (done) await EmailCampaign.findByIdAndUpdate(campaign._id, { $inc: { failedCount: 1 } });
            console.error('[EmailQueue] Failed -> ' + r.email + ': ' + err.message);
          }

          // Rate-limit: Brevo free = ~300/day. 500ms delay = safe at any burst.
          if (c.batchDelay > 0) await new Promise(ok => setTimeout(ok, c.batchDelay));
        }
      }
    } catch (err) {
      console.error('[EmailQueue] Crash:', err.message);
    } finally {
      queueBusy = false;
    }
  }

  cron.schedule('*/30 * * * * *', runQueue);

  // ── Helper: build subscriber list based on campaign filter ─────────────────
  async function buildSubscriberList(campaign) {
    const f = campaign.recipientFilter || 'all';
    if (f === 'manual' && campaign.manualRecipients && campaign.manualRecipients.length) {
      const cleanEmails = [...new Set(
        campaign.manualRecipients
          .map(e => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )];
      const list = [];
      for (const em of cleanEmails) {
        let sub = await EmailSubscriber.findOne({ email: em });
        if (sub) {
          if (sub.status === 'unsubscribed') continue; // Respect user unsubscribe
        } else {
          // Auto-register manual email as active subscriber
          const localPart = em.split('@')[0] || 'Subscriber';
          sub = await EmailSubscriber.create({
            email: em,
            name: localPart,
            firstName: localPart,
            source: 'manual',
            status: 'subscribed',
          });
        }
        list.push(sub.toObject ? sub.toObject() : sub);
      }
      return list;
    }
    const q = { status: 'subscribed' };
    if (f === 'community') q.source = 'community';
    if (f === 'imported')  q.source = 'import';
    return EmailSubscriber.find(q).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADMIN API ROUTES   (all require adminAuth JWT middleware)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Dashboard stats ────────────────────────────────────────────────────────
  app.get('/api/admin/email/dashboard', adminAuth, async (req, res) => {
    try {
      const [tSubs, aSubs, uSubs, bSubs, tCamp, dCamp, sCamp, recent] = await Promise.all([
        EmailSubscriber.countDocuments(),
        EmailSubscriber.countDocuments({ status: 'subscribed' }),
        EmailSubscriber.countDocuments({ status: 'unsubscribed' }),
        EmailSubscriber.countDocuments({ status: 'bounced' }),
        EmailCampaign.countDocuments(),
        EmailCampaign.countDocuments({ status: 'draft' }),
        EmailCampaign.countDocuments({ status: 'sent' }),
        EmailCampaign.find().sort({ createdAt: -1 }).limit(10).populate('templateId', 'name').lean(),
      ]);
      const aggResult = await EmailCampaign.aggregate([
        { $match: { status: 'sent' } },
        { $group: { _id: null, ts: { $sum: '$sentCount' }, to: { $sum: '$openedCount' }, tc: { $sum: '$clickedCount' } } },
      ]);
      const agg = aggResult[0] || { ts: 0, to: 0, tc: 0 };
      res.json({
        subscribers: { total: tSubs, active: aSubs, unsubscribed: uSubs, bounced: bSubs },
        campaigns: { total: tCamp, draft: dCamp, sent: sCamp, emailsSent: agg.ts, emailsOpened: agg.to, emailsClicked: agg.tc },
        recentCampaigns: recent,
      });
    } catch (err) {
      console.error('[Email] Dashboard:', err.message);
      res.status(500).json({ error: 'Failed to load email dashboard' });
    }
  });

  // ── Subscribers: List (with search/filter/pagination) ──────────────────────
  app.get('/api/admin/email/subscribers', adminAuth, async (req, res) => {
    try {
      const { page = 1, limit = 50, search = '', status = '', source = '' } = req.query;
      const q = {};
      if (status) q.status = status;
      if (source) q.source = source;
      if (search && search.trim()) {
        const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        q.$or = [{ email: re }, { name: re }, { firstName: re }, { lastName: re }];
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [subscribers, total] = await Promise.all([
        EmailSubscriber.find(q).sort({ subscribedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        EmailSubscriber.countDocuments(q),
      ]);
      res.json({ subscribers, total, page: Number(page), limit: Number(limit) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscribers: Add single ────────────────────────────────────────────────
  app.post('/api/admin/email/subscribers', adminAuth, async (req, res) => {
    try {
      const { email, name, firstName, lastName, source = 'manual' } = req.body;
      const clean = (email || '').toLowerCase().trim();
      if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
        return res.status(400).json({ error: 'Valid email address is required' });
      const existing = await EmailSubscriber.findOne({ email: clean });
      if (existing) {
        if (existing.status === 'unsubscribed') {
          existing.status = 'subscribed';
          existing.subscribedAt = new Date();
          existing.unsubscribedAt = null;
          await existing.save();
          return res.json({ subscriber: existing, resubscribed: true });
        }
        return res.status(409).json({ error: 'Email is already subscribed' });
      }
      const sub = await EmailSubscriber.create({
        email: clean,
        name:      (name || ((firstName || '') + ' ' + (lastName || ''))).trim(),
        firstName: (firstName || (name && name.split(' ')[0]) || '').trim(),
        lastName:  (lastName  || (name && name.split(' ').slice(1).join(' ')) || '').trim(),
        source,
      });
      res.status(201).json({ subscriber: sub });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscribers: Update ────────────────────────────────────────────────────
  app.patch('/api/admin/email/subscribers/:id', adminAuth, async (req, res) => {
    try {
      const u = {};
      ['name','firstName','lastName','status','source'].forEach(k => { if (req.body[k] !== undefined) u[k] = req.body[k]; });
      if (u.status === 'subscribed')   { u.subscribedAt = new Date(); u.unsubscribedAt = null; }
      if (u.status === 'unsubscribed') { u.unsubscribedAt = new Date(); }
      const sub = await EmailSubscriber.findByIdAndUpdate(req.params.id, u, { new: true });
      if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
      res.json({ subscriber: sub });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscribers: Delete ────────────────────────────────────────────────────
  app.delete('/api/admin/email/subscribers/:id', adminAuth, async (req, res) => {
    try { await EmailSubscriber.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscribers: CSV Import ────────────────────────────────────────────────
  app.post('/api/admin/email/subscribers/import', adminAuth, async (req, res) => {
    try {
      const { csvData, confirm = false, columnMap = {} } = req.body;
      if (!csvData) return res.status(400).json({ error: 'csvData is required' });
      let records;
      try { records = csvParse(csvData, { columns: true, skip_empty_lines: true, trim: true }); }
      catch (e) { return res.status(400).json({ error: 'Invalid CSV: ' + e.message }); }

      const emailCol = columnMap.email || 'email';
      const nameCol  = columnMap.name  || 'name';
      const fnCol    = columnMap.firstName || 'firstName';
      const lnCol    = columnMap.lastName  || 'lastName';
      const stats    = { add: 0, resubscribe: 0, duplicate: 0, invalid: 0 };
      const preview  = [];
      const toWrite  = [];

      for (const row of records) {
        const email = (row[emailCol] || '').toLowerCase().trim();
        const name  = (row[nameCol]  || '').trim();
        const fn    = (row[fnCol]    || name.split(' ')[0] || '').trim();
        const ln    = (row[lnCol]    || name.split(' ').slice(1).join(' ') || '').trim();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          stats.invalid++;
          preview.push({ email, status: 'invalid', reason: 'Invalid email format' });
          continue;
        }
        const exists = await EmailSubscriber.findOne({ email }).select('status').lean();
        if (exists) {
          if (exists.status === 'subscribed') {
            stats.duplicate++;
            preview.push({ email, status: 'duplicate', reason: 'Already subscribed' });
          } else {
            stats.resubscribe++;
            preview.push({ email, status: 'resubscribe', reason: 'Will be re-subscribed' });
            toWrite.push({ email, name: name || (fn + ' ' + ln).trim(), fn, ln, resubscribe: true });
          }
        } else {
          stats.add++;
          preview.push({ email, status: 'add', reason: 'New subscriber' });
          toWrite.push({ email, name: name || (fn + ' ' + ln).trim(), fn, ln, resubscribe: false });
        }
      }

      if (!confirm) return res.json({ preview: preview.slice(0, 25), stats, totalRows: records.length });

      let written = 0;
      for (const r of toWrite) {
        try {
          if (r.resubscribe) {
            await EmailSubscriber.updateOne({ email: r.email }, {
              status: 'subscribed', subscribedAt: new Date(), unsubscribedAt: null,
              ...(r.name ? { name: r.name }      : {}),
              ...(r.fn   ? { firstName: r.fn }   : {}),
              ...(r.ln   ? { lastName:  r.ln }   : {}),
            });
          } else {
            await EmailSubscriber.create({
              email: r.email, name: r.name, firstName: r.fn, lastName: r.ln, source: 'import',
            });
          }
          written++;
        } catch { /* skip races */ }
      }
      res.json({ ok: true, written, stats });
    } catch (err) {
      console.error('[Email] Import:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Subscribers: CSV Export ────────────────────────────────────────────────
  app.get('/api/admin/email/subscribers/export', adminAuth, async (req, res) => {
    try {
      const subs = await EmailSubscriber.find().sort({ subscribedAt: -1 }).lean();
      const esc  = v => '"' + String(v || '').replace(/"/g, '""') + '"';
      const rows = [
        ['email','name','firstName','lastName','status','source','subscribedAt','unsubscribedAt'],
        ...subs.map(s => [
          s.email, s.name, s.firstName, s.lastName, s.status, s.source,
          s.subscribedAt   ? new Date(s.subscribedAt).toISOString()   : '',
          s.unsubscribedAt ? new Date(s.unsubscribedAt).toISOString() : '',
        ]),
      ].map(r => r.map(esc).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ollypedia-subscribers-' + Date.now() + '.csv"');
      res.send(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscribers: Sync from Community Users ─────────────────────────────────
  app.post('/api/admin/email/subscribers/sync-community', adminAuth, async (req, res) => {
    try {
      const CommunityUser = mongoose.models.CommunityUser;
      if (!CommunityUser) return res.json({ ok: true, synced: 0, existing: 0, total: 0 });
      const users = await CommunityUser.find({ status: { $ne: 'banned' } }).lean();
      let added = 0;
      let existing = 0;
      for (const u of users) {
        if (!u.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) continue;
        const cleanEmail = u.email.toLowerCase().trim();
        const found = await EmailSubscriber.findOne({ email: cleanEmail });
        if (found) {
          existing++;
        } else {
          const name = (u.displayName || u.username || '').trim();
          const parts = name.split(' ');
          await EmailSubscriber.create({
            email: cleanEmail,
            name: name,
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            source: 'community',
            communityUserId: u._id,
            status: 'subscribed'
          });
          added++;
        }
      }
      res.json({ ok: true, synced: added, existing, total: users.length });
    } catch (err) {
      console.error('[Email] Sync Community:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Templates: CRUD ────────────────────────────────────────────────────────
  app.get('/api/admin/email/templates', adminAuth, async (req, res) => {
    try { res.json({ templates: await EmailTemplate.find().sort({ createdAt: -1 }).lean() }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/admin/email/templates', adminAuth, async (req, res) => {
    try {
      const { name, subject, html } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Template name is required' });
      if (!html || !html.trim()) return res.status(400).json({ error: 'Template HTML is required' });
      const variables = [...new Set([...html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
      const tmpl = await EmailTemplate.create({ name: name.trim(), subject: subject || '', html, variables });
      res.status(201).json({ template: tmpl });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/admin/email/templates/:id', adminAuth, async (req, res) => {
    try {
      const t = await EmailTemplate.findById(req.params.id).lean();
      if (!t) return res.status(404).json({ error: 'Template not found' });
      res.json({ template: t });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/admin/email/templates/:id', adminAuth, async (req, res) => {
    try {
      const u = {};
      if (req.body.name    !== undefined) u.name    = req.body.name.trim();
      if (req.body.subject !== undefined) u.subject = req.body.subject;
      if (req.body.html    !== undefined) {
        u.html      = req.body.html;
        u.variables = [...new Set([...req.body.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
      }
      const t = await EmailTemplate.findByIdAndUpdate(req.params.id, u, { new: true });
      if (!t) return res.status(404).json({ error: 'Template not found' });
      res.json({ template: t });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/admin/email/templates/:id', adminAuth, async (req, res) => {
    try {
      const u = {};
      if (req.body.name    !== undefined) u.name    = req.body.name.trim();
      if (req.body.subject !== undefined) u.subject = req.body.subject;
      if (req.body.html    !== undefined) {
        u.html      = req.body.html;
        u.variables = [...new Set([...req.body.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
      }
      const t = await EmailTemplate.findByIdAndUpdate(req.params.id, u, { new: true });
      if (!t) return res.status(404).json({ error: 'Template not found' });
      res.json({ template: t });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Templates: Re-seed / restore official Ollypedia brand templates ────────
  app.post('/api/admin/email/templates/reseed-brand', adminAuth, async (req, res) => {
    try {
      const brandTemplates = getOfficialBrandTemplates();
      for (const bt of brandTemplates) {
        await EmailTemplate.findOneAndUpdate(
          { name: bt.name },
          { ...bt, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
      const all = await EmailTemplate.find().sort({ createdAt: -1 }).lean();
      res.json({ ok: true, count: brandTemplates.length, templates: all });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/admin/email/templates/:id', adminAuth, async (req, res) => {
    try { await EmailTemplate.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/admin/email/templates/:id/duplicate', adminAuth, async (req, res) => {
    try {
      const src = await EmailTemplate.findById(req.params.id).lean();
      if (!src) return res.status(404).json({ error: 'Template not found' });
      const dup = await EmailTemplate.create({
        name: src.name + ' (Copy)', subject: src.subject, html: src.html, variables: src.variables,
      });
      res.status(201).json({ template: dup });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Campaigns: CRUD ────────────────────────────────────────────────────────
  app.get('/api/admin/email/campaigns', adminAuth, async (req, res) => {
    try {
      const campaigns = await EmailCampaign.find().sort({ createdAt: -1 })
        .populate('templateId', 'name subject').lean();
      res.json({ campaigns });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/admin/email/campaigns', adminAuth, async (req, res) => {
    try {
      const { name, subject, fromName, fromEmail, replyTo, templateId, recipientFilter, manualRecipients } = req.body;
      if (!name || !name.trim())    return res.status(400).json({ error: 'Campaign name is required' });
      if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject line is required' });
      const c = cfg();
      const campaign = await EmailCampaign.create({
        name: name.trim(), subject: subject.trim(),
        fromName:  fromName  || c.fromName,
        fromEmail: fromEmail || c.fromEmail,
        replyTo:   replyTo   || '',
        templateId:       templateId       || null,
        recipientFilter:  recipientFilter  || 'all',
        manualRecipients: manualRecipients || [],
      });
      res.status(201).json({ campaign });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/admin/email/campaigns/:id', adminAuth, async (req, res) => {
    try {
      const campaign = await EmailCampaign.findById(req.params.id)
        .populate('templateId', 'name subject html').lean();
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (campaign.status === 'sending') {
        const [pN, sN, fN] = await Promise.all([
          EmailCampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'pending' }),
          EmailCampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'sent' }),
          EmailCampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'failed' }),
        ]);
        campaign._progress = { pending: pN, sent: sN, failed: fN, total: campaign.recipientCount };
      }
      res.json({ campaign });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/admin/email/campaigns/:id', adminAuth, async (req, res) => {
    try {
      const campaign = await EmailCampaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (!['draft','scheduled'].includes(campaign.status))
        return res.status(400).json({ error: 'Cannot edit a campaign with status: ' + campaign.status });
      ['name','subject','fromName','fromEmail','replyTo','templateId','recipientFilter','manualRecipients','scheduledAt']
        .forEach(k => { if (req.body[k] !== undefined) campaign[k] = req.body[k]; });
      await campaign.save();
      res.json({ campaign });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Campaigns: Recipient count preview ─────────────────────────────────────
  app.post('/api/admin/email/campaigns/recipient-count', adminAuth, async (req, res) => {
    try {
      const { recipientFilter = 'all', manualRecipients = [] } = req.body;
      let count;
      if (recipientFilter === 'manual') {
        const cleanEmails = [...new Set(
          (Array.isArray(manualRecipients) ? manualRecipients : [])
            .map(e => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
            .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        )];
        const unsubs = await EmailSubscriber.find({
          email: { $in: cleanEmails },
          status: 'unsubscribed',
        }).distinct('email');
        count = cleanEmails.filter(e => !unsubs.includes(e)).length;
      } else {
        const q = { status: 'subscribed' };
        if (recipientFilter === 'community') q.source = 'community';
        if (recipientFilter === 'imported')  q.source = 'import';
        count = await EmailSubscriber.countDocuments(q);
      }
      res.json({ count });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Campaigns: Send (enqueue) ──────────────────────────────────────────────
  app.post('/api/admin/email/campaigns/:id/send', adminAuth, async (req, res) => {
    try {
      if (!req.body.confirmed) return res.status(400).json({ error: 'confirmed: true is required to send a campaign' });

      const campaign = await EmailCampaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (!['draft','scheduled'].includes(campaign.status))
        return res.status(400).json({ error: 'Cannot send campaign with status: ' + campaign.status });
      if (!campaign.templateId)
        return res.status(400).json({ error: 'Please assign a template to this campaign before sending' });

      const template = await EmailTemplate.findById(campaign.templateId);
      if (!template) return res.status(400).json({ error: 'Assigned template was not found' });

      const c = cfg();
      if (!c.user || !c.pass)
        return res.status(400).json({ error: 'Brevo SMTP not configured — set BREVO_SMTP_USER and BREVO_SMTP_KEY in .env' });

      const subscribers = await buildSubscriberList(campaign);
      if (!subscribers.length)
        return res.status(400).json({ error: 'No eligible subscribed recipients found for this campaign' });

      // Freeze HTML + subject at send time
      campaign.snapshotHtml    = template.html;
      campaign.snapshotSubject = campaign.subject;
      campaign.status          = 'sending';
      campaign.startedAt       = new Date();
      campaign.recipientCount  = subscribers.length;
      campaign.sentCount       = 0;
      campaign.failedCount     = 0;
      campaign.openedCount     = 0;
      campaign.clickedCount    = 0;
      await campaign.save();

      // Create pending recipient records (500 at a time)
      const docs = subscribers.map(s => ({
        campaignId:   campaign._id,
        subscriberId: s._id,
        email:        s.email,
        firstName:    s.firstName || (s.name || '').split(' ')[0] || '',
        lastName:     s.lastName  || (s.name || '').split(' ').slice(1).join(' ') || '',
        name:         s.name || '',
        status:       'pending',
      }));
      for (let i = 0; i < docs.length; i += 500) {
        await EmailCampaignRecipient.insertMany(docs.slice(i, i + 500), { ordered: false });
      }

      console.log('[EmailQueue] Queued "' + campaign.name + '" -> ' + subscribers.length + ' recipients');
      res.json({ ok: true, recipientCount: subscribers.length, campaignId: campaign._id });

    } catch (err) {
      console.error('[Email] Send:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Campaigns: Cancel ──────────────────────────────────────────────────────
  app.post('/api/admin/email/campaigns/:id/cancel', adminAuth, async (req, res) => {
    try {
      const campaign = await EmailCampaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (!['sending','scheduled','draft'].includes(campaign.status))
        return res.status(400).json({ error: 'Cannot cancel campaign with status: ' + campaign.status });
      campaign.status = 'cancelled';
      await campaign.save();
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Campaigns: Delete ──────────────────────────────────────────────────────
  app.delete('/api/admin/email/campaigns/:id', adminAuth, async (req, res) => {
    try {
      const campaign = await EmailCampaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (!['draft','cancelled','failed'].includes(campaign.status))
        return res.status(400).json({ error: 'Only draft, cancelled, or failed campaigns can be deleted' });
      await Promise.all([
        EmailCampaign.findByIdAndDelete(campaign._id),
        EmailCampaignRecipient.deleteMany({ campaignId: campaign._id }),
      ]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Campaigns: Recipients list ─────────────────────────────────────────────
  app.get('/api/admin/email/campaigns/:id/recipients', adminAuth, async (req, res) => {
    try {
      const { page = 1, limit = 50, status = '' } = req.query;
      const q = { campaignId: req.params.id };
      if (status) q.status = status;
      const [recipients, total] = await Promise.all([
        EmailCampaignRecipient.find(q).sort({ createdAt: 1 })
          .skip((Number(page)-1)*Number(limit)).limit(Number(limit)).lean(),
        EmailCampaignRecipient.countDocuments(q),
      ]);
      res.json({ recipients, total });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Test email ─────────────────────────────────────────────────────────────
  app.post('/api/admin/email/test', adminAuth, async (req, res) => {
    try {
      const { to, templateId, subject, html: rawHtml, fromEmail, fromName } = req.body;
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
        return res.status(400).json({ error: 'Valid recipient email is required' });

      let html = rawHtml || '';
      let subj = subject || 'Test Email from Ollypedia';

      if (templateId) {
        const tmpl = await EmailTemplate.findById(templateId).lean();
        if (!tmpl) return res.status(404).json({ error: 'Template not found' });
        html = tmpl.html;
        subj = subject || tmpl.subject || subj;
      }
      if (!html.trim()) return res.status(400).json({ error: 'Email HTML is required' });

      const c = cfg();
      const sampleUnsub = (SITE_URL || 'https://www.ollypedia.in') + '/unsubscribe?token=sample_preview_token';
      html = replaceVars(html, { firstName: 'John', lastName: 'Doe', name: 'John Doe', email: to, unsubscribeUrl: sampleUnsub });
      html = addFooter(html, sampleUnsub);

      const resolvedFromEmail = (fromEmail && fromEmail.trim()) || c.fromEmail;
      const resolvedFromName  = (fromName  && fromName.trim())  || c.fromName;

      const info = await sendEmail({
        to,
        subject: '[TEST] ' + subj,
        html,
        fromEmail: resolvedFromEmail,
        fromName: resolvedFromName,
      });

      res.json({
        ok: true,
        to,
        fromEmail: resolvedFromEmail,
        fromName: resolvedFromName,
        messageId: info.messageId,
      });
    } catch (err) {
      console.error('[Email] Test:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Settings status endpoint ────────────────────────────────────────────────
  app.get('/api/admin/email/settings', adminAuth, async (req, res) => {
    try {
      const c = cfg();
      res.json({
        host: c.host,
        port: c.port,
        configured: Boolean(c.apiKey || (c.user && c.pass)),
        mode: c.apiKey ? 'REST API (HTTPS Port 443)' : 'SMTP (Port ' + c.port + ')',
        hasApiKey: Boolean(c.apiKey),
        hasSmtp: Boolean(c.user && c.pass),
        smtpUser: c.user ? c.user.replace(/(?<=^..).+(?=@)/, '***') : '',
        fromEmail: c.fromEmail,
        fromName: c.fromName,
        backendUrl: c.backendUrl,
        batchSize: c.batchSize,
        batchDelay: c.batchDelay,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC ROUTES — Unsubscribe + Email Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  // Unsubscribe page — renders a branded HTML page in browser
  app.get('/unsubscribe', async (req, res) => {
    const { token, rid } = req.query;
    if (!token || !rid) return res.send(unsubPage('Bad Request', 'Invalid or missing unsubscribe parameters.', false));
    try {
      const r = await EmailCampaignRecipient.findById(rid).lean();
      if (!r) return res.send(unsubPage('Already Done', 'You have already been removed from our mailing list.', false));
      const expected = makeToken('unsub:' + rid + ':' + r.campaignId, cfg().unsubSecret);
      if (token !== expected)
        return res.status(400).send(unsubPage('Invalid Link', 'This link is invalid or has expired. Please contact support.', false));
      res.send(unsubPage(
        'Unsubscribe',
        'Are you sure you want to unsubscribe <strong style="color:#e2e8f0;">' + r.email + '</strong> from Ollypedia emails?',
        true, token, rid
      ));
    } catch {
      res.status(500).send(unsubPage('Error', 'Something went wrong. Please try again later.', false));
    }
  });

  // Unsubscribe confirm (POST — called by the page JS)
  app.post('/api/email/unsubscribe', async (req, res) => {
    const { token, rid } = req.body;
    if (!token || !rid) return res.status(400).json({ error: 'Invalid request' });
    try {
      const r = await EmailCampaignRecipient.findById(rid).lean();
      if (!r) return res.json({ ok: true });
      const expected = makeToken('unsub:' + rid + ':' + r.campaignId, cfg().unsubSecret);
      if (token !== expected) return res.status(400).json({ error: 'Invalid token' });
      await EmailSubscriber.findOneAndUpdate(
        { email: r.email }, { status: 'unsubscribed', unsubscribedAt: new Date() }
      );
      await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { unsubscribedCount: 1 } });
      console.log('[Email] Unsubscribed: ' + r.email);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Open tracking — 1×1 transparent GIF
  const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  app.get('/api/email/track/open/:token', async (req, res) => {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.send(TRANSPARENT_GIF);
    setImmediate(async () => {
      try {
        const r = await EmailCampaignRecipient.findOne({ openToken: req.params.token });
        if (r && !r.openedAt) {
          r.openedAt = new Date();
          await r.save();
          await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { openedCount: 1 } });
        }
      } catch {}
    });
  });

  // Click tracking — redirect
  app.get('/api/email/track/click/:token', async (req, res) => {
    const dest = req.query.url ? decodeURIComponent(req.query.url) : (SITE_URL || 'https://www.ollypedia.in');
    res.redirect(302, dest);
    setImmediate(async () => {
      try {
        const r = await EmailCampaignRecipient.findOne({ clickToken: req.params.token });
        if (r) {
          let updated = false;
          if (!r.clickedAt) {
            r.clickedAt = new Date();
            await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { clickedCount: 1 } });
            updated = true;
          }
          // A click guarantees the recipient opened the email (standard across all ESPs)
          if (!r.openedAt) {
            r.openedAt = new Date();
            await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { openedCount: 1 } });
            updated = true;
          }
          if (updated) await r.save();
        }
      } catch (err) {
        console.error('[EmailTrack] Click error:', err.message);
      }
    });
  });

  // Admin testing helper: manually simulate open / click for any recipient to verify dashboard stats
  app.post('/api/admin/email/campaigns/:id/recipients/:rid/simulate-open', adminAuth, async (req, res) => {
    try {
      const r = await EmailCampaignRecipient.findById(req.params.rid);
      if (!r) return res.status(404).json({ error: 'Recipient not found' });
      if (!r.openedAt) {
        r.openedAt = new Date();
        await r.save();
        await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { openedCount: 1 } });
      }
      res.json({ ok: true, recipient: r });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/admin/email/campaigns/:id/recipients/:rid/simulate-click', adminAuth, async (req, res) => {
    try {
      const r = await EmailCampaignRecipient.findById(req.params.rid);
      if (!r) return res.status(404).json({ error: 'Recipient not found' });
      let mod = false;
      if (!r.clickedAt) {
        r.clickedAt = new Date();
        await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { clickedCount: 1 } });
        mod = true;
      }
      if (!r.openedAt) {
        r.openedAt = new Date();
        await EmailCampaign.findByIdAndUpdate(r.campaignId, { $inc: { openedCount: 1 } });
        mod = true;
      }
      if (mod) await r.save();
      res.json({ ok: true, recipient: r });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Branded unsubscribe HTML page ──────────────────────────────────────────
  function unsubPage(title, body, showForm, token, rid) {
    const site = SITE_URL || 'https://www.ollypedia.in';
    const safeToken = (token || '').replace(/'/g, "\\'");
    const safeRid   = (rid   || '').replace(/'/g, "\\'");
    return '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + title + ' \u2014 Ollypedia</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}' +
      'body{background:#0b0f19;color:#f1f5f9;font-family:"Segoe UI",system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}' +
      '.card{background:#131c2e;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:44px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)}' +
      '.logo{font-size:1.4rem;font-weight:900;color:#ffd700;margin-bottom:28px;letter-spacing:.04em}' +
      '.icon{font-size:2.8rem;margin-bottom:16px}' +
      'h1{font-size:1.35rem;font-weight:800;margin-bottom:12px}' +
      'p{color:#94a3b8;line-height:1.65;margin-bottom:24px;font-size:.92rem}' +
      '.btn{display:inline-block;padding:12px 28px;border-radius:10px;font-size:.88rem;font-weight:700;cursor:pointer;border:none;text-decoration:none;transition:all .15s}' +
      '.btn-p{background:linear-gradient(135deg,#c9973a,#a87926);color:#fff;margin-right:10px}' +
      '.btn-g{background:rgba(255,255,255,.06);color:#94a3b8}' +
      '.btn:hover{opacity:.88;transform:translateY(-1px)}' +
      '.ok{color:#34d399}' +
      '@media(max-width:460px){.card{padding:32px 22px}.btn{display:block;width:100%;margin:8px 0}}' +
      '</style></head><body><div class="card">' +
      '<div class="logo">\uD83C\uDFAC OLLYPEDIA</div>' +
      (showForm
        ? '<div class="icon">\uD83D\uDCED</div><h1>' + title + '</h1><p>' + body + '</p>' +
          '<button class="btn btn-p" id="ub-btn" onclick="doUnsub()">Yes, Unsubscribe Me</button>' +
          '<a href="' + site + '" class="btn btn-g">Cancel</a>' +
          '<script>function doUnsub(){var b=document.getElementById("ub-btn");b.disabled=true;b.textContent="Processing\u2026";' +
          'fetch("/api/email/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json"},' +
          'body:JSON.stringify({token:"' + safeToken + '",rid:"' + safeRid + '"})})' +
          '.then(function(r){return r.json()}).then(function(d){' +
          'if(d.ok){document.querySelector(".card").innerHTML=' +
          '"<div class=\\"icon ok\\">\u2713</div><h1>Unsubscribed</h1>' +
          '<p>You have been removed from Ollypedia emails.<br><br>' +
          '<a href=\\"' + site + '\\" style=\\"color:#ffd700;\\">Visit Ollypedia</a></p>";' +
          '}else{alert(d.error||"Something went wrong.");b.disabled=false;b.textContent="Yes, Unsubscribe Me";}' +
          '}).catch(function(){alert("Network error. Please try again.");})' +
          '}</script>'
        : '<div class="icon">\u2139\uFE0F</div><h1>' + title + '</h1><p>' + body + '</p>' +
          '<a href="' + site + '" class="btn btn-p">Visit Ollypedia</a>') +
      '</div></body></html>';
  }

  // ── Official Ollypedia Brand Email Templates ─────────────────────────────
  function getOfficialBrandTemplates() {
    return [
      {
        name: 'Community Spotlight: Two Exciting Odia Releases. Join the Conversation!',
        subject: '🎬 Community Spotlight: Two Exciting Odia Releases. Join the Conversation!',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Spotlight - Ollypedia</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#f0ece4;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.8);">
          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:32px 30px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <a href="https://www.ollypedia.in/" style="text-decoration:none;display:inline-block;">
                <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:900;letter-spacing:1px;color:#c9973a;text-transform:uppercase;">🎬 OLLYPEDIA</div>
                <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#888070;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">THE DEFINITIVE ODIA FILM ENCYCLOPEDIA</div>
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <!-- Pill Badge in Ollypedia Gold -->
              <div style="text-align:center;margin-bottom:20px;">
                <span style="display:inline-block;background:rgba(201,151,58,0.12);color:#e8b96a;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;padding:6px 16px;border-radius:20px;border:1px solid rgba(201,151,58,0.35);text-transform:uppercase;letter-spacing:1px;">
                  🎬 COMMUNITY SPOTLIGHT • ODIA CINEMA TALK
                </span>
              </div>

              <!-- Main Heading -->
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#f0ece4;text-align:center;margin:0 0 16px;line-height:1.35;">
                Two Exciting Odia Releases. <span style="color:#c9973a;">Join the Conversation!</span>
              </h1>

              <p style="font-size:15px;line-height:1.65;color:#888070;text-align:center;margin:0 0 28px;">
                Namaskar {{firstName}}, discussions are heating up in the Ollypedia Community! Fans and movie buffs across Odisha are sharing their genuine first-day reactions, star ratings, and box office predictions.
              </p>

              <!-- Discussion Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <div style="font-size:12px;font-weight:700;color:#c9973a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🔥 TRENDING COMMUNITY TOPIC</div>
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700;color:#f0ece4;margin-bottom:8px;">What is your verdict on the new theatrical releases this weekend?</div>
                    <p style="font-size:13px;line-height:1.6;color:#888070;margin:0 0 16px;">
                      From direction and soundtrack to screenplay and box-office potential — read authentic audience reviews without spoilers and cast your vote on the community leaderboard.
                    </p>
                    <a href="https://www.ollypedia.in/community" style="display:inline-block;background:linear-gradient(135deg,#c9973a 0%,#e8b96a 100%);color:#0a0a0a;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;padding:10px 22px;text-decoration:none;border-radius:6px;">
                      Open Discussion on Ollypedia &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Quick Links Bar -->
              <div style="border-top:1px solid #2a2a2a;padding-top:20px;text-align:center;">
                <p style="font-size:13px;color:#888070;margin:0 0 12px;">Explore popular sections on Ollypedia:</p>
                <div style="font-size:13px;">
                  <a href="https://www.ollypedia.in/movies" style="color:#c9973a;text-decoration:none;margin:0 10px;font-weight:600;">Latest Movies</a>
                  <span style="color:#2a2a2a;">|</span>
                  <a href="https://www.ollypedia.in/boxoffice" style="color:#c9973a;text-decoration:none;margin:0 10px;font-weight:600;">Box Office</a>
                  <span style="color:#2a2a2a;">|</span>
                  <a href="https://www.ollypedia.in/community" style="color:#c9973a;text-decoration:none;margin:0 10px;font-weight:600;">Community Hub</a>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        variables: ['firstName', 'name', 'websiteUrl', 'unsubscribeUrl']
      },
      {
        name: 'Weekly Odia Cinema Digest',
        subject: 'This Week on Ollypedia: New Releases, Box Office & Odia Cinema Updates 🎬',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ollypedia Weekly</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#f0ece4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 30px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <a href="https://www.ollypedia.in/" style="text-decoration:none;display:inline-block;">
                <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:900;color:#c9973a;letter-spacing:1px;text-transform:uppercase;">🎬 OLLYPEDIA</div>
                <div style="font-size:11px;color:#888070;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">THE DEFINITIVE ODIA FILM ENCYCLOPEDIA</div>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <h2 style="font-family:'Playfair Display',Georgia,serif;color:#f0ece4;margin:0 0 12px;font-size:22px;">Hello {{firstName}},</h2>
              <p style="font-size:15px;line-height:1.65;color:#888070;margin:0 0 24px;">
                Here are the top trending stories, trailer launches, and verified box-office figures from across the Odia film industry this week.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="color:#c9973a;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">SPOTLIGHT</div>
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#f0ece4;margin-bottom:6px;">Explore Verified Box Office Numbers</div>
                    <p style="font-size:13px;color:#888070;line-height:1.5;margin:0 0 14px;">Daily gross & net collections, distributor shares, and trade verdicts for running Odia films.</p>
                    <a href="https://www.ollypedia.in/boxoffice" style="display:inline-block;background:linear-gradient(135deg,#c9973a 0%,#e8b96a 100%);color:#0a0a0a;font-weight:700;font-size:13px;padding:9px 20px;text-decoration:none;border-radius:6px;">View Box Office &rarr;</a>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;padding:12px 0;">
                <a href="https://www.ollypedia.in/movies" style="display:inline-block;background:#1a1a1a;border:1px solid #2a2a2a;color:#f0ece4;font-size:14px;font-weight:600;padding:12px 30px;text-decoration:none;border-radius:6px;">Discover New Releases &rarr;</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        variables: ['firstName', 'name', 'websiteUrl', 'unsubscribeUrl']
      },
      {
        name: 'Official Trailer Premiere Alert',
        subject: '⚡ Official Trailer Premiere Alert: Watch Now on Ollypedia!',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trailer Premiere - Ollypedia</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#f0ece4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 30px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <a href="https://www.ollypedia.in/" style="text-decoration:none;">
                <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:900;color:#c9973a;letter-spacing:1px;text-transform:uppercase;">🎬 OLLYPEDIA</div>
                <div style="font-size:11px;color:#888070;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">THE DEFINITIVE ODIA FILM ENCYCLOPEDIA</div>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;text-align:center;">
              <span style="display:inline-block;background:rgba(201,151,58,0.12);color:#e8b96a;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;border:1px solid rgba(201,151,58,0.35);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">
                ⚡ NEW TRAILER RELEASE
              </span>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#f0ece4;margin:0 0 16px;">The Official Trailer is Out Now!</h1>
              <p style="font-size:15px;line-height:1.65;color:#888070;margin:0 0 28px;">
                Namaskar {{firstName}}, stream the newly released official trailer in high definition, check out full cast credits, and rate the trailer on Ollypedia.
              </p>
              <a href="https://www.ollypedia.in/movies" style="display:inline-block;background:linear-gradient(135deg,#c9973a 0%,#e8b96a 100%);color:#0a0a0a;font-weight:700;font-size:14px;padding:12px 32px;text-decoration:none;border-radius:6px;">
                ▶ Watch Official Trailer Now
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        variables: ['firstName', 'name', 'websiteUrl', 'unsubscribeUrl']
      },
      {
        name: 'Weekend Box Office Report',
        subject: '📊 Ollypedia Box Office: Weekend Collections, Verdicts & Records',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Box Office Report - Ollypedia</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#f0ece4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:32px 30px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <a href="https://www.ollypedia.in/" style="text-decoration:none;">
                <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:900;color:#c9973a;letter-spacing:1px;text-transform:uppercase;">🎬 OLLYPEDIA</div>
                <div style="font-size:11px;color:#888070;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">THE DEFINITIVE ODIA FILM ENCYCLOPEDIA</div>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <div style="text-align:center;margin-bottom:18px;">
                <span style="display:inline-block;background:rgba(201,151,58,0.12);color:#e8b96a;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;border:1px solid rgba(201,151,58,0.35);text-transform:uppercase;letter-spacing:1px;">
                  📊 TRADE ANALYSIS
                </span>
              </div>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;text-align:center;color:#f0ece4;margin:0 0 16px;">Weekend Box Office Breakdown</h1>
              <p style="font-size:15px;line-height:1.65;color:#888070;text-align:center;margin:0 0 24px;">
                Hello {{firstName}}, here is the verified collection breakdown for running Odia films across single screens and multiplexes in Odisha.
              </p>
              <div style="text-align:center;padding:12px 0;">
                <a href="https://www.ollypedia.in/boxoffice" style="display:inline-block;background:linear-gradient(135deg,#c9973a 0%,#e8b96a 100%);color:#0a0a0a;font-weight:700;font-size:14px;padding:12px 30px;text-decoration:none;border-radius:6px;">
                  View Live Box Office Records &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        variables: ['firstName', 'name', 'websiteUrl', 'unsubscribeUrl']
      }
    ];
  }

  // ── Seed starter templates on startup if empty ────────────────────────────
  async function seedStarterTemplates() {
    try {
      const count = await EmailTemplate.countDocuments();
      if (count > 0) return;
      const starterTemplates = getOfficialBrandTemplates();
      await EmailTemplate.insertMany(starterTemplates);
      console.log('[Email] Seeded ' + starterTemplates.length + ' official Ollypedia brand email templates.');
    } catch (err) {
      console.warn('[Email] Template seed skipped:', err.message);
    }
  }

  seedStarterTemplates();

  console.log('[Email] Email Marketing module loaded — Brevo SMTP (smtp-relay.brevo.com:587)');
};