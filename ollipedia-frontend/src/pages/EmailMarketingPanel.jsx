/**
 * EmailMarketingPanel.jsx
 *
 * Ollypedia Admin Portal — Email Marketing Module
 * Powered by Brevo (formerly Sendinblue) SMTP via nodemailer.
 * Free tier: 300 emails/day, SMTP Relay on port 587.
 *
 * Sub-tabs:
 *   1. Dashboard   — KPI metrics, delivery stats, Brevo status, recent campaigns
 *   2. Campaigns   — Campaign list, 4-step creation wizard, progress & analytics
 *   3. Templates   — HTML template builder, token insertion, live iframe preview
 *   4. Subscribers — List, search/filter, manual add, CSV import/export, community sync
 *   5. Settings    — SMTP test email sender, configuration guide & token cheatsheet
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API } from '../api/api';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const THEME = {
  bg: '#0c0e17',
  card: '#131826',
  cardHover: '#182032',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(255, 215, 0, 0.4)',
  gold: '#ffd700',
  goldMuted: '#c9973a',
  text: '#f1f5f9',
  muted: '#94a3b8',
  subtle: '#64748b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

function StatusBadge({ status }) {
  const styles = {
    draft: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8', label: 'Draft' },
    scheduled: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', text: '#60a5fa', label: 'Scheduled' },
    sending: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', text: '#fbbf24', label: '⚡ Sending' },
    sent: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', text: '#34d399', label: '✓ Sent' },
    cancelled: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: '#f87171', label: 'Cancelled' },
    failed: { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', label: 'Failed' },
    subscribed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399', label: 'Subscribed' },
    unsubscribed: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: '#f87171', label: 'Unsubscribed' },
    bounced: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', label: 'Bounced' },
  };

  const s = styles[status] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', text: '#94a3b8', label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      {s.label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function EmailMarketingPanel({ onToast }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard Data
  const [dashboard, setDashboard] = useState(null);

  // Campaigns Data
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState(null);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  // Templates Data
  const [templates, setTemplates] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Subscribers Data
  const [subscribers, setSubscribers] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('');
  const [subSourceFilter, setSubSourceFilter] = useState('');
  const [singleSubModalOpen, setSingleSubModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);

  // Settings & Test Send Data
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSubj, setTestEmailSubj] = useState('Test Email from Ollypedia Admin');
  const [testEmailFrom, setTestEmailFrom] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailSettings, setEmailSettings] = useState(null);

  // Internal Toast Notifications (guarantees toasts are always displayed in UI)
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type = 'info') => {
    if (onToast) onToast(msg, type);
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const loadSettings = async () => {
    try {
      const data = await API.adminGetEmailSettings();
      setEmailSettings(data);
      if (data?.fromEmail && !testEmailFrom) {
        setTestEmailFrom(data.fromEmail);
      }
    } catch (err) {
      console.warn('[EmailMarketing] loadSettings:', err.message);
    }
  };

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await API.adminGetEmailDashboard();
      setDashboard(data);
    } catch (err) {
      toast(err.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await API.adminGetEmailCampaigns();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      toast(err.message || 'Failed to load campaigns', 'error');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await API.adminGetEmailTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      toast(err.message || 'Failed to load templates', 'error');
    }
  };

  const loadSubscribers = async (page = 1) => {
    try {
      setLoading(true);
      const data = await API.adminGetEmailSubscribers({
        page,
        limit: 25,
        search: subSearch,
        status: subStatusFilter,
        source: subSourceFilter,
      });
      setSubscribers(data.subscribers || []);
      setSubTotal(data.total || 0);
      setSubPage(page);
    } catch (err) {
      toast(err.message || 'Failed to load subscribers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when tab changes
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
      loadCampaigns();
    } else if (activeTab === 'campaigns') {
      loadCampaigns();
      loadTemplates();
    } else if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'subscribers') {
      loadSubscribers(1);
    } else if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  // Polling for live campaigns while in campaigns tab
  useEffect(() => {
    if (activeTab !== 'campaigns') return;
    const hasSending = campaigns.some((c) => c.status === 'sending');
    if (!hasSending) return;

    const interval = setInterval(() => {
      loadCampaigns();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, campaigns]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSendTestEmail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmailTo.trim()) {
      toast('Please enter a recipient email address', 'error');
      return;
    }
    try {
      setTestEmailSending(true);
      const res = await API.adminSendTestEmail({
        to: testEmailTo.trim(),
        fromEmail: testEmailFrom.trim() || undefined,
        subject: testEmailSubj,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0a0a0a; color: #f0ece4; border-radius: 12px; border: 1px solid #2a2a2a; padding: 28px;">
          <h2 style="color: #c9973a; margin-top: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px;">🎬 Ollypedia Live Test Email</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #f0ece4;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #888070;">
            This is a verified test email sent via <strong>Brevo SMTP Relay</strong> (<code style="color: #c9973a;">smtp-relay.brevo.com:587</code>) from the Ollypedia Admin Portal.
          </p>
          <div style="margin: 20px 0; padding: 14px; background: #111111; border-radius: 8px; border: 1px solid #2a2a2a; font-size: 13px;">
            <div style="color: #888070; margin-bottom: 4px;"><strong>Sender (From):</strong> <span style="color: #f0ece4;">${res?.fromEmail || testEmailFrom || 'Configured Sender'}</span></div>
            <div style="color: #888070; margin-bottom: 4px;"><strong>Recipient:</strong> <span style="color: #f0ece4;">${testEmailTo}</span></div>
            <div style="color: #888070;"><strong>Timestamp:</strong> <span style="color: #f0ece4;">${new Date().toLocaleString()}</span></div>
          </div>
          <div style="margin-top: 20px; padding: 12px; background: rgba(201,151,58,0.1); border-radius: 8px; border: 1px solid rgba(201,151,58,0.3); font-size: 12px; color: #e8b96a;">
            ✅ <strong>Deliverability Check:</strong> If this email reached your inbox, your Brevo sender configuration is working properly!
          </div>
        </div>`,
      });
      toast(`✅ Test email dispatched to ${testEmailTo} from ${res?.fromEmail || testEmailFrom || 'sender'}!`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to send test email. Check your Brevo credentials in .env.', 'error');
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleSyncCommunity = async () => {
    if (!window.confirm('Sync all active Ollypedia community users into Email Marketing subscribers?')) return;
    try {
      setLoading(true);
      const res = await API.adminSyncCommunitySubscribers();
      toast(`✅ Synced successfully! Added ${res.synced} new subscribers (${res.existing} already existed).`, 'success');
      if (activeTab === 'subscribers') loadSubscribers(1);
      if (activeTab === 'dashboard') loadDashboard();
    } catch (err) {
      toast(err.message || 'Sync failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncReviews = async () => {
    if (!window.confirm('Sync all user review emails from movies into Email Marketing subscribers?')) return;
    try {
      setLoading(true);
      const res = await API.adminSyncReviewsSubscribers();
      toast(`✅ Synced successfully! Added ${res.synced} new subscribers from user reviews (${res.existing} already existed).`, 'success');
      if (activeTab === 'subscribers') loadSubscribers(1);
      if (activeTab === 'dashboard') loadDashboard();
    } catch (err) {
      toast(err.message || 'Review sync failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 1: DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  function renderDashboard() {
    const subs = dashboard?.subscribers || { total: 0, active: 0, unsubscribed: 0, bounced: 0 };
    const camps = dashboard?.campaigns || { total: 0, draft: 0, sent: 0, emailsSent: 0, emailsOpened: 0, emailsClicked: 0 };
    const openRate = camps.emailsSent > 0 ? Math.round((camps.emailsOpened / camps.emailsSent) * 100) : 0;
    const clickRate = camps.emailsOpened > 0 ? Math.round((camps.emailsClicked / camps.emailsOpened) * 100) : 0;

    return (
      <div>
        {/* KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Active Subscribers */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #ffd700, #c9973a)' }} />
            <div style={{ fontSize: '0.78rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active Subscribers</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{fmtNum(subs.active)}</div>
            <div style={{ fontSize: '0.75rem', color: THEME.subtle, marginTop: 6 }}>
              Total database: <strong style={{ color: THEME.text }}>{fmtNum(subs.total)}</strong>
            </div>
          </div>

          {/* Total Emails Sent */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#3b82f6' }} />
            <div style={{ fontSize: '0.78rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total Emails Sent</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{fmtNum(camps.emailsSent)}</div>
            <div style={{ fontSize: '0.75rem', color: THEME.subtle, marginTop: 6 }}>
              Across <strong style={{ color: THEME.text }}>{fmtNum(camps.sent)}</strong> completed campaigns
            </div>
          </div>

          {/* Average Open Rate */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#10b981' }} />
            <div style={{ fontSize: '0.78rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Average Open Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399' }}>{openRate}%</div>
            <div style={{ fontSize: '0.75rem', color: THEME.subtle, marginTop: 6 }}>
              <strong style={{ color: THEME.text }}>{fmtNum(camps.emailsOpened)}</strong> unique opens tracked
            </div>
          </div>

          {/* Click-Through Rate */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#8b5cf6' }} />
            <div style={{ fontSize: '0.78rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Click-Through Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa' }}>{clickRate}%</div>
            <div style={{ fontSize: '0.75rem', color: THEME.subtle, marginTop: 6 }}>
              <strong style={{ color: THEME.text }}>{fmtNum(camps.emailsClicked)}</strong> link clicks tracked
            </div>
          </div>
        </div>

        {/* Middle Row: Provider Status Banner + Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Provider Status & Quota */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Brevo SMTP Relay Active</span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '3px 10px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                300 Free Emails / Day
              </span>
            </div>
            <p style={{ color: THEME.muted, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 16px' }}>
              Connected via secure TLS relay (<strong>smtp-relay.brevo.com:587</strong>). Campaigns are processed by the automated background queue with automatic batching, rate-limiting, and delivery tracking.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setTestEmailTo('');
                  setActiveTab('settings');
                }}
                className="btn btn-sm btn-outline"
                style={{ borderRadius: 8, fontSize: '0.78rem' }}
              >
                ⚡ Send SMTP Test Email
              </button>
              <button onClick={handleSyncReviews} className="btn btn-sm btn-outline" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                ⭐ Sync User Reviews
              </button>
              <button onClick={handleSyncCommunity} className="btn btn-sm btn-outline" style={{ borderRadius: 8, fontSize: '0.78rem' }}>
                🌐 Sync Community Users ({subs.total})
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Quick Actions
            </div>
            <button
              onClick={() => {
                setActiveTab('campaigns');
                setWizardOpen(true);
              }}
              className="btn btn-sm btn-gold"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 8, fontWeight: 700 }}
            >
              + Create Campaign
            </button>
            <button
              onClick={() => {
                setActiveTab('templates');
                setEditingTemplate({ name: '', subject: '', html: '' });
                setTemplateModalOpen(true);
              }}
              className="btn btn-sm btn-outline"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 8 }}
            >
              + New Template
            </button>
            <button
              onClick={() => {
                setActiveTab('subscribers');
                setCsvImportModalOpen(true);
              }}
              className="btn btn-sm btn-outline"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 8 }}
            >
              📥 Import CSV Contacts
            </button>
          </div>
        </div>

        {/* Recent Campaigns Table */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Recent Campaigns</h3>
            <button onClick={() => setActiveTab('campaigns')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: THEME.gold }}>
              View All &rarr;
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.muted }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✉️</div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No campaigns created yet. Click "+ Create Campaign" to get started.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}`, textAlign: 'left', color: THEME.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '10px 14px' }}>Campaign Name</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Recipients</th>
                    <th style={{ padding: '10px 14px' }}>Opens / Clicks</th>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 5).map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#fff' }}>
                        <div>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: THEME.muted, fontWeight: 400 }}>{c.subject}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: '14px', color: THEME.text }}>
                        {c.sentCount || 0} / {c.recipientCount || 0}
                      </td>
                      <td style={{ padding: '14px', color: THEME.text }}>
                        <span style={{ color: '#34d399', fontWeight: 700 }}>{c.openedCount || 0}</span> opens
                        <span style={{ color: THEME.subtle, margin: '0 6px' }}>&bull;</span>
                        <span style={{ color: '#a78bfa', fontWeight: 700 }}>{c.clickedCount || 0}</span> clicks
                      </td>
                      <td style={{ padding: '14px', color: THEME.subtle, fontSize: '0.75rem' }}>
                        {fmtDate(c.completedAt || c.startedAt || c.createdAt)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setViewingCampaign(c);
                            loadCampaignRecipients(c._id);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.75rem', color: THEME.gold }}
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 2: CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchFilter = campaignFilter === 'all' || c.status === campaignFilter;
      const matchSearch =
        !campaignSearch ||
        c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.subject.toLowerCase().includes(campaignSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [campaigns, campaignFilter, campaignSearch]);

  const loadCampaignRecipients = async (campaignId) => {
    try {
      setRecipientsLoading(true);
      const data = await API.adminGetCampaignRecipients(campaignId, { limit: 100 });
      setCampaignRecipients(data.recipients || []);
    } catch (err) {
      toast(err.message || 'Failed to load recipients', 'error');
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleSendCampaign = async (campaign) => {
    if (!window.confirm(`Are you sure you want to SEND "${campaign.name}" to all eligible subscribers now?`)) return;
    try {
      setLoading(true);
      const res = await API.adminSendEmailCampaign(campaign._id);
      toast(`🚀 Campaign queued! Sending to ${res.recipientCount} recipients in the background.`, 'success');
      loadCampaigns();
    } catch (err) {
      toast(err.message || 'Failed to send campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm('Cancel this campaign? Pending recipients will not be emailed.')) return;
    try {
      await API.adminCancelEmailCampaign(campaignId);
      toast('Campaign cancelled', 'info');
      loadCampaigns();
    } catch (err) {
      toast(err.message || 'Failed to cancel', 'error');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Permanently delete this campaign?')) return;
    try {
      await API.adminDeleteEmailCampaign(campaignId);
      toast('Campaign deleted', 'info');
      loadCampaigns();
      if (viewingCampaign?._id === campaignId) setViewingCampaign(null);
    } catch (err) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  function renderCampaigns() {
    return (
      <div>
        {/* Top Control Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: THEME.muted, fontSize: '0.8rem' }}>🔍</span>
              <input
                className="form-input"
                style={{ paddingLeft: 30, width: 240, height: 36, borderRadius: 8, background: THEME.card, fontSize: '0.82rem' }}
                placeholder="Search campaigns…"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'draft', 'sending', 'sent', 'cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setCampaignFilter(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    background: campaignFilter === f ? THEME.gold : 'rgba(255,255,255,0.06)',
                    color: campaignFilter === f ? '#000' : THEME.muted,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setWizardOpen(true)} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
            + Create New Campaign
          </button>
        </div>

        {/* Campaign Cards List */}
        {filteredCampaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, color: THEME.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📬</div>
            <h4 style={{ color: '#fff', margin: '0 0 8px' }}>No campaigns found</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Create a campaign to engage your Ollypedia audience with newsletters, trailer drops, or box office reports.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredCampaigns.map((c) => {
              const progressPct = c.recipientCount > 0 ? Math.round(((c.sentCount + (c.failedCount || 0)) / c.recipientCount) * 100) : 0;
              const isSending = c.status === 'sending';

              return (
                <div
                  key={c._id}
                  style={{
                    background: THEME.card,
                    border: `1px solid ${isSending ? 'rgba(245, 158, 11, 0.4)' : THEME.border}`,
                    borderRadius: 14,
                    padding: '20px 24px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{c.name}</h3>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: THEME.goldMuted, fontWeight: 600 }}>
                        Subject: <span style={{ color: THEME.text }}>{c.subject}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: THEME.subtle, marginTop: 4 }}>
                        Template: <strong style={{ color: THEME.muted }}>{c.templateId?.name || 'Custom'}</strong> &bull; Audience:{' '}
                        <span style={{ textTransform: 'capitalize' }}>{c.recipientFilter || 'all'}</span> &bull; Created {fmtDate(c.createdAt)}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {c.status === 'draft' && (
                        <button onClick={() => handleSendCampaign(c)} className="btn btn-sm btn-gold" style={{ borderRadius: 8, fontWeight: 700 }}>
                          🚀 Send Now
                        </button>
                      )}
                      {isSending && (
                        <button onClick={() => handleCancelCampaign(c._id)} className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8 }}>
                          Stop / Cancel
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setViewingCampaign(c);
                          loadCampaignRecipients(c._id);
                        }}
                        className="btn btn-sm btn-outline"
                        style={{ borderRadius: 8 }}
                      >
                        Analytics & Log
                      </button>
                      {['draft', 'cancelled', 'failed'].includes(c.status) && (
                        <button onClick={() => handleDeleteCampaign(c._id)} className="btn btn-sm btn-ghost" style={{ color: THEME.danger, padding: '4px 8px' }} title="Delete campaign">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sending progress bar */}
                  {isSending && (
                    <div style={{ marginTop: 14, background: 'rgba(245, 158, 11, 0.1)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>
                        <span>Queue processing in background ({c.sentCount || 0} sent / {c.recipientCount || 0} total)</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressPct}%`, background: '#f59e0b', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Sent statistics pill bar */}
                  {c.status === 'sent' && (
                    <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${THEME.border}`, fontSize: '0.8rem', color: THEME.muted }}>
                      <div>
                        Sent: <strong style={{ color: '#fff' }}>{fmtNum(c.sentCount)}</strong>
                      </div>
                      <div>
                        Opened: <strong style={{ color: '#34d399' }}>{fmtNum(c.openedCount)}</strong> ({c.sentCount > 0 ? Math.round(((c.openedCount || 0) / c.sentCount) * 100) : 0}%)
                      </div>
                      <div>
                        Clicked: <strong style={{ color: '#a78bfa' }}>{fmtNum(c.clickedCount)}</strong> ({c.openedCount > 0 ? Math.round(((c.clickedCount || 0) / (c.openedCount || 1)) * 100) : 0}%)
                      </div>
                      {c.unsubscribedCount > 0 && (
                        <div>
                          Unsubscribed: <strong style={{ color: '#f87171' }}>{fmtNum(c.unsubscribedCount)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Campaign Creation Wizard Modal */}
        {wizardOpen && <CampaignWizardModal onClose={() => setWizardOpen(false)} templates={templates} onCreated={() => { setWizardOpen(false); loadCampaigns(); }} toast={toast} />}

        {/* Campaign Analytics / Detail Modal */}
        {viewingCampaign && (
          <CampaignDetailModal
            campaign={viewingCampaign}
            recipients={campaignRecipients}
            loading={recipientsLoading}
            onClose={() => setViewingCampaign(null)}
            onRefreshRecipients={() => {
              loadCampaignRecipients(viewingCampaign._id);
              loadCampaigns();
            }}
            toast={toast}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 3: TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDuplicateTemplate = async (id) => {
    try {
      await API.adminDuplicateEmailTemplate(id);
      toast('Template duplicated', 'success');
      loadTemplates();
    } catch (err) {
      toast(err.message || 'Duplicate failed', 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this email template?')) return;
    try {
      await API.adminDeleteEmailTemplate(id);
      toast('Template deleted', 'info');
      loadTemplates();
    } catch (err) {
      toast(err.message || 'Delete failed', 'error');
    }
  };

  function renderTemplates() {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Email Templates</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: THEME.muted }}>
              Responsive HTML layouts with personalized variable placeholders.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => {
                if (!window.confirm('Reset/re-seed official Ollypedia brand email templates (using your exact brand palette & domain routers)?')) return;
                try {
                  await API.adminReseedBrandEmailTemplates();
                  toast('Restored official Ollypedia brand templates!', 'success');
                  loadTemplates();
                } catch (err) {
                  toast(err.message || 'Failed to reseed templates', 'error');
                }
              }}
              className="btn btn-outline btn-sm"
              style={{ borderRadius: 8, color: THEME.muted }}
              title="Reset official Ollypedia brand templates"
            >
              🔄 Restore Brand Templates
            </button>
            <button
              onClick={() => {
                setEditingTemplate({ name: '', subject: '', html: '' });
                setTemplateModalOpen(true);
              }}
              className="btn btn-gold btn-sm"
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              + Create Template
            </button>
          </div>
        </div>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, color: THEME.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎨</div>
            <h4 style={{ color: '#fff', margin: '0 0 8px' }}>No templates found</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Create your first responsive template with our visual code builder.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {templates.map((t) => (
              <div
                key={t._id}
                style={{
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border 0.2s',
                }}
              >
                {/* Visual miniature preview */}
                <div style={{ height: 160, background: '#0b0f19', borderBottom: `1px solid ${THEME.border}`, position: 'relative', overflow: 'hidden' }}>
                  <iframe
                    title={t.name}
                    srcDoc={t.html}
                    sandbox="allow-same-origin"
                    style={{
                      width: '200%',
                      height: '200%',
                      transform: 'scale(0.5)',
                      transformOrigin: 'top left',
                      border: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)' }} />
                </div>

                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: '0.78rem', color: THEME.goldMuted, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject || 'No default subject'}
                  </div>

                  {/* Variables pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                    {(t.variables || []).slice(0, 4).map((v) => (
                      <span key={v} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)', color: THEME.muted, padding: '2px 8px', borderRadius: 6 }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: 8, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
                    <button
                      onClick={() => setPreviewTemplate(t)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', borderRadius: 6 }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(t);
                        setTemplateModalOpen(true);
                      }}
                      className="btn btn-gold btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', borderRadius: 6, fontWeight: 700 }}
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDuplicateTemplate(t._id)} className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', fontSize: '0.75rem' }} title="Duplicate">
                      📋
                    </button>
                    <button onClick={() => handleDeleteTemplate(t._id)} className="btn btn-ghost btn-sm" style={{ color: THEME.danger, padding: '6px 8px', fontSize: '0.75rem' }} title="Delete">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Template Builder / Editor Modal */}
        {templateModalOpen && (
          <TemplateEditorModal
            template={editingTemplate}
            onClose={() => {
              setTemplateModalOpen(false);
              setEditingTemplate(null);
            }}
            onSaved={() => {
              setTemplateModalOpen(false);
              setEditingTemplate(null);
              loadTemplates();
            }}
            toast={toast}
          />
        )}

        {/* Template Fullscreen Preview Modal */}
        {previewTemplate && (
          <div className="modal-overlay" onClick={() => setPreviewTemplate(null)} style={{ zIndex: 1000 }}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 760, width: '95%', background: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 0, overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, color: '#fff' }}>Preview: {previewTemplate.name}</div>
                <button onClick={() => setPreviewTemplate(null)} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
              </div>
              <div style={{ padding: 20, background: '#0b0f19', maxHeight: '75vh', overflowY: 'auto' }}>
                <iframe
                  title="Full Preview"
                  srcDoc={previewTemplate.html}
                  sandbox="allow-same-origin"
                  style={{ width: '100%', minHeight: 480, border: 'none', borderRadius: 8, background: '#fff' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 4: SUBSCRIBERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm('Delete this subscriber?')) return;
    try {
      await API.adminDeleteEmailSubscriber(id);
      toast('Subscriber removed', 'info');
      loadSubscribers(subPage);
    } catch (err) {
      toast(err.message || 'Delete failed', 'error');
    }
  };

  const handleToggleSubStatus = async (sub) => {
    const nextStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    try {
      await API.adminUpdateEmailSubscriber(sub._id, { status: nextStatus });
      toast(`Updated status to ${nextStatus}`, 'success');
      loadSubscribers(subPage);
    } catch (err) {
      toast(err.message || 'Update failed', 'error');
    }
  };

  function renderSubscribers() {
    return (
      <div>
        {/* Actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: THEME.muted, fontSize: '0.8rem' }}>🔍</span>
              <input
                className="form-input"
                style={{ paddingLeft: 30, width: 220, height: 36, borderRadius: 8, background: THEME.card, fontSize: '0.82rem' }}
                placeholder="Search email or name…"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadSubscribers(1)}
              />
            </div>

            <select
              className="form-select"
              style={{ height: 36, borderRadius: 8, background: THEME.card, fontSize: '0.82rem', borderColor: THEME.border }}
              value={subStatusFilter}
              onChange={(e) => {
                setSubStatusFilter(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>

            <select
              className="form-select"
              style={{ height: 36, borderRadius: 8, background: THEME.card, fontSize: '0.82rem', borderColor: THEME.border }}
              value={subSourceFilter}
              onChange={(e) => {
                setSubSourceFilter(e.target.value);
              }}
            >
              <option value="">All Sources</option>
              <option value="community">Community (Live)</option>
              <option value="review">User Reviews</option>
              <option value="import">CSV Import</option>
              <option value="manual">Manual</option>
            </select>

            <button onClick={() => loadSubscribers(1)} className="btn btn-sm btn-outline" style={{ borderRadius: 8, height: 36 }}>
              Filter
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleSyncReviews} className="btn btn-sm btn-outline" style={{ borderRadius: 8 }}>
              ⭐ Sync User Reviews
            </button>
            <button onClick={handleSyncCommunity} className="btn btn-sm btn-outline" style={{ borderRadius: 8 }}>
              🌐 Sync Community Users
            </button>
            <a
              href={API.adminExportEmailSubscribersUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline"
              style={{ borderRadius: 8, textDecoration: 'none' }}
            >
              📤 Export CSV
            </a>
            <button onClick={() => setCsvImportModalOpen(true)} className="btn btn-sm btn-outline" style={{ borderRadius: 8 }}>
              📥 Import CSV
            </button>
            <button onClick={() => setSingleSubModalOpen(true)} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
              + Add Subscriber
            </button>
          </div>
        </div>

        {/* Subscribers Table */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: THEME.muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <th style={{ padding: '12px 18px' }}>Subscriber</th>
                <th style={{ padding: '12px 18px' }}>Status</th>
                <th style={{ padding: '12px 18px' }}>Source</th>
                <th style={{ padding: '12px 18px' }}>Subscribed On</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: THEME.muted }}>
                    No subscribers found matching your criteria.
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{s.email}</div>
                      {s.name && <div style={{ fontSize: '0.75rem', color: THEME.muted }}>{s.name}</div>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={s.status} />
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: s.source === 'review' ? 'rgba(255,180,0,0.15)' : s.source === 'community' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                          color: s.source === 'review' ? '#ffb400' : s.source === 'community' ? '#60a5fa' : THEME.muted,
                          border: s.source === 'review' ? '1px solid rgba(255,180,0,0.3)' : s.source === 'community' ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 700,
                        }}
                      >
                        {s.source === 'review' ? '⭐ Review' : s.source === 'community' ? '🌐 Community' : s.source}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: THEME.subtle, fontSize: '0.75rem' }}>
                      {fmtDate(s.subscribedAt)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleSubStatus(s)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', color: s.status === 'subscribed' ? THEME.warning : THEME.success }}
                      >
                        {s.status === 'subscribed' ? 'Unsubscribe' : 'Re-subscribe'}
                      </button>
                      <button
                        onClick={() => handleDeleteSubscriber(s._id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: THEME.danger, padding: '4px 8px', fontSize: '0.75rem' }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ padding: '14px 18px', borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: THEME.muted }}>
            <div>
              Showing {subscribers.length} of {subTotal} subscribers
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={subPage <= 1}
                onClick={() => loadSubscribers(subPage - 1)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                &larr; Prev
              </button>
              <button
                disabled={subPage * 25 >= subTotal}
                onClick={() => loadSubscribers(subPage + 1)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Single Add Subscriber Modal */}
        {singleSubModalOpen && (
          <SingleSubscriberModal
            onClose={() => setSingleSubModalOpen(false)}
            onAdded={() => {
              setSingleSubModalOpen(false);
              loadSubscribers(1);
            }}
            toast={toast}
          />
        )}

        {/* CSV Import Modal */}
        {csvImportModalOpen && (
          <CsvImportModal
            onClose={() => setCsvImportModalOpen(false)}
            onImported={() => {
              setCsvImportModalOpen(false);
              loadSubscribers(1);
            }}
            toast={toast}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TAB 5: SETTINGS & SMTP TEST
  // ═══════════════════════════════════════════════════════════════════════════
  function renderSettings() {
    return (
      <div style={{ maxWidth: 840 }}>
        {/* Deliverability Diagnostic Banner */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#f87171', fontSize: '1.02rem', fontWeight: 800 }}>
                Why Did Local Logs Say &ldquo;Sent (250 OK: queued)&rdquo; But No Email Was Received in Inbox?
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Brevo&rsquo;s SMTP server accepts any email sent with valid SMTP credentials and immediately replies with <code style={{ color: '#fbbf24', background: '#0b0f19', padding: '2px 6px', borderRadius: 4 }}>250 OK: queued</code>.
                <strong> However, Brevo will quietly drop or block emails if your &ldquo;From Email&rdquo; is NOT a verified sender in your Brevo account.</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ background: '#0b0f19', padding: '12px 14px', borderRadius: 8, border: `1px solid ${THEME.border}` }}>
                  <div style={{ color: THEME.gold, fontWeight: 800, fontSize: '0.82rem', marginBottom: 4 }}>
                    ⚡ Option 1: Instant Fix (No DNS required)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: THEME.muted, lineHeight: 1.5 }}>
                    Enter the <strong>exact email you used to register on Brevo</strong> (e.g. your Gmail) in the &ldquo;Sender Email (From)&rdquo; box below or in <code style={{ color: THEME.gold }}>BREVO_FROM_EMAIL</code>. Brevo verifies your account registration email automatically!
                  </div>
                </div>
                <div style={{ background: '#0b0f19', padding: '12px 14px', borderRadius: 8, border: `1px solid ${THEME.border}` }}>
                  <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.82rem', marginBottom: 4 }}>
                    🏷️ Option 2: Verify noreply@ollypedia.in
                  </div>
                  <div style={{ fontSize: '0.78rem', color: THEME.muted, lineHeight: 1.5 }}>
                    Open <a href="https://app.brevo.com/senders" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>app.brevo.com/senders</a> &rarr; Click <strong>&ldquo;Add a sender&rdquo;</strong> &rarr; Add <code style={{ color: '#34d399' }}>noreply@ollypedia.in</code> &rarr; Confirm the 6-digit code Brevo sends to that inbox.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Backend SMTP Status */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Backend Brevo SMTP Status</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{emailSettings?.host || 'smtp-relay.brevo.com'}:{emailSettings?.port || 587}</span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: emailSettings?.configured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: emailSettings?.configured ? '#34d399' : '#ef4444', border: `1px solid ${emailSettings?.configured ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {emailSettings?.configured ? 'Credentials Configured' : 'Credentials Missing'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: THEME.muted, marginTop: 4 }}>
              Default From: <strong style={{ color: THEME.gold }}>{emailSettings?.fromEmail || 'noreply@ollypedia.in'}</strong> &bull; SMTP User: <code style={{ color: '#cbd5e1' }}>{emailSettings?.smtpUser || 'configured in .env'}</code>
            </div>
          </div>
          <button onClick={loadSettings} className="btn btn-outline btn-sm" style={{ borderRadius: 8, fontSize: '0.75rem' }}>
            🔄 Refresh Status
          </button>
        </div>

        {/* Test Email Card */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>⚡ Send Live Test Email</h3>
          <p style={{ color: THEME.muted, fontSize: '0.85rem', margin: '0 0 20px' }}>
            Send a live test message to your personal inbox. Make sure the Sender Email below is verified in your Brevo account.
          </p>

          <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Sender Email (From) *
                </label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="your-brevo-login-email@gmail.com"
                  value={testEmailFrom}
                  onChange={(e) => setTestEmailFrom(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                />
                <span style={{ fontSize: '0.7rem', color: THEME.muted, marginTop: 4, display: 'block' }}>
                  Must be verified in Brevo. Use your Brevo signup email for instant delivery!
                </span>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Recipient Email (To) *
                </label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="your-personal-email@gmail.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                />
                <span style={{ fontSize: '0.7rem', color: THEME.muted, marginTop: 4, display: 'block' }}>
                  The email address where you want to receive the test.
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Subject Line
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Test Email from Ollypedia"
                value={testEmailSubj}
                onChange={(e) => setTestEmailSubj(e.target.value)}
                style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
              />
            </div>
            <div>
              <button type="submit" disabled={testEmailSending} className="btn btn-gold btn-sm" style={{ padding: '10px 24px', fontWeight: 700, borderRadius: 8 }}>
                {testEmailSending ? 'Dispatching Test Email…' : 'Send Test Email Now'}
              </button>
            </div>
          </form>
        </div>

        {/* Configuration Guide */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>⚙️ Brevo SMTP Configuration</h3>
          <p style={{ color: THEME.muted, fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.6 }}>
            Brevo (formerly Sendinblue) provides 300 emails/day free forever with full SMTP and API support. The backend connects automatically using the following environment variables in your backend <code style={{ color: THEME.gold }}>.env</code> file:
          </p>

          <pre
            style={{
              background: '#0b0f19',
              padding: 16,
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              fontSize: '0.82rem',
              color: '#34d399',
              overflowX: 'auto',
              lineHeight: 1.6,
            }}
          >
{`# Brevo SMTP Configuration (Ollypedia-Backend/.env)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_account_email@domain.com
BREVO_SMTP_KEY=xsmtpsib-your-smtp-master-key-here
BREVO_FROM_EMAIL=noreply@ollypedia.in
BREVO_FROM_NAME="Ollypedia"`}
          </pre>

          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', fontSize: '0.82rem', color: THEME.muted }}>
            <strong style={{ color: THEME.gold }}>Where to find your SMTP Key:</strong> Log into <a href="https://app.brevo.com" target="_blank" rel="noreferrer" style={{ color: THEME.gold }}>app.brevo.com</a> &rarr; Top right account dropdown &rarr; <strong>SMTP & API</strong> &rarr; Click <strong>Generate a new SMTP key</strong>.
          </div>
        </div>

        {/* Template Variables Reference */}
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>📝 Template Variables Cheatsheet</h3>
          <p style={{ color: THEME.muted, fontSize: '0.85rem', margin: '0 0 16px' }}>
            Insert these tokens in your email subjects and HTML templates. They are automatically substituted for each recipient:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, fontSize: '0.82rem' }}>
            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{firstName}}'}</div>
            <div style={{ color: THEME.muted }}>Recipient's first name (falls back to "there")</div>

            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{lastName}}'}</div>
            <div style={{ color: THEME.muted }}>Recipient's last name</div>

            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{name}}'}</div>
            <div style={{ color: THEME.muted }}>Full name of recipient</div>

            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{email}}'}</div>
            <div style={{ color: THEME.muted }}>Recipient's email address</div>

            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{websiteUrl}}'}</div>
            <div style={{ color: THEME.muted }}>Link to Ollypedia site (https://www.ollypedia.in)</div>

            <div style={{ color: THEME.gold, fontWeight: 700 }}>{'{{unsubscribeUrl}}'}</div>
            <div style={{ color: THEME.muted }}>Secure 1-click unsubscribe URL with HMAC verification</div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOP NAVIGATION & CONTAINER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: '0 32px 60px', color: THEME.text }}>
      {/* Floating Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 28,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 420,
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                padding: '12px 18px',
                borderRadius: 10,
                background:
                  t.type === 'success'
                    ? '#064e3b'
                    : t.type === 'error'
                    ? '#7f1d1d'
                    : t.type === 'warning'
                    ? '#78350f'
                    : '#1e293b',
                border: `1px solid ${
                  t.type === 'success'
                    ? '#10b981'
                    : t.type === 'error'
                    ? '#ef4444'
                    : t.type === 'warning'
                    ? '#f59e0b'
                    : '#64748b'
                }`,
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <span>{t.msg}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  opacity: 0.75,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 20px', borderBottom: `1px solid ${THEME.border}`, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              📧 Email Marketing
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.72rem', fontWeight: 800 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} /> Brevo SMTP
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: THEME.muted }}>
            Build responsive HTML campaigns, import subscribers, and deliver targeted Odia cinema newsletters.
          </p>
        </div>

        {/* Top Right Quick Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              setActiveTab('campaigns');
              setWizardOpen(true);
            }}
            className="btn btn-gold btn-sm"
            style={{ borderRadius: 8, fontWeight: 700 }}
          >
            + New Campaign
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 14, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'campaigns', label: `📢 Campaigns (${campaigns.length})` },
          { key: 'templates', label: `📝 Templates (${templates.length})` },
          { key: 'subscribers', label: `👥 Subscribers (${dashboard?.subscribers?.active || subTotal || 0})` },
          { key: 'settings', label: '⚙️ Settings & Test' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 700,
              background: activeTab === t.key ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
              color: activeTab === t.key ? THEME.gold : THEME.muted,
              border: `1px solid ${activeTab === t.key ? 'rgba(255, 215, 0, 0.35)' : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading && activeTab === 'dashboard' ? (
        <div style={{ textAlign: 'center', padding: 60, color: THEME.muted }}>⏳ Loading Email Marketing data…</div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'campaigns' && renderCampaigns()}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'subscribers' && renderSubscribers()}
          {activeTab === 'settings' && renderSettings()}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL: 4-STEP CAMPAIGN WIZARD
// ═══════════════════════════════════════════════════════════════════════════
function CampaignWizardModal({ onClose, templates, onCreated, toast }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    fromName: 'Ollypedia',
    fromEmail: 'noreply@ollypedia.in',
    replyTo: '',
    recipientFilter: 'all',
    manualRecipientsText: '',
    templateId: templates[0]?._id || '',
  });

  // Calculate recipient count preview when audience filter changes
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const manuals = form.manualRecipientsText
          .split(/[\n,]/)
          .map((e) => e.trim())
          .filter((e) => e.length > 0);
        const res = await API.adminGetCampaignRecipientCount({
          recipientFilter: form.recipientFilter,
          manualRecipients: manuals,
        });
        if (active) setPreviewCount(res.count || 0);
      } catch {
        if (active) setPreviewCount(0);
      }
    };
    fetchCount();
    return () => {
      active = false;
    };
  }, [form.recipientFilter, form.manualRecipientsText]);

  const handleFinish = async (andSend = false) => {
    if (!form.name.trim()) {
      toast('Campaign name is required', 'error');
      return;
    }
    if (!form.subject.trim()) {
      toast('Subject line is required', 'error');
      return;
    }
    if (!form.templateId) {
      toast('Please select an email template', 'error');
      return;
    }

    try {
      setSaving(true);
      const manuals = form.manualRecipientsText
        .split(/[\n,]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const res = await API.adminCreateEmailCampaign({
        name: form.name.trim(),
        subject: form.subject.trim(),
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        recipientFilter: form.recipientFilter,
        manualRecipients: manuals,
        templateId: form.templateId,
      });

      if (andSend && res.campaign?._id) {
        await API.adminSendEmailCampaign(res.campaign._id);
        toast('🚀 Campaign created and queued for immediate sending!', 'success');
      } else {
        toast('✅ Campaign saved as draft!', 'success');
      }
      onCreated();
    } catch (err) {
      toast(err.message || 'Failed to create campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = templates.find((t) => t._id === form.templateId);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '95%',
          background: THEME.card,
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Wizard Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Create Email Campaign</h3>
            <div style={{ fontSize: '0.78rem', color: THEME.goldMuted, marginTop: 4 }}>
              Step {step} of 4: {step === 1 ? 'Campaign Details' : step === 2 ? 'Select Audience' : step === 3 ? 'Choose Template' : 'Review & Launch'}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', width: `${(step / 4) * 100}%`, background: THEME.gold, transition: 'width 0.25s' }} />
        </div>

        {/* Step Body */}
        <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
          {/* STEP 1: Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Campaign Internal Name *
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Babushaan 2026 Film Announcement"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Email Subject Line *
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. 🎬 Exclusive Trailer Drop: Watch Now on Ollypedia!"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Sender Name
                  </label>
                  <input
                    className="form-input"
                    value={form.fromName}
                    onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                    style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Sender Email
                  </label>
                  <input
                    className="form-input"
                    value={form.fromEmail}
                    onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                    style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Audience */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                Choose which subscribers will receive this campaign:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {[
                  { id: 'all', title: 'All Active Subscribers', desc: 'Sends to all confirmed subscribed users' },
                  { id: 'community', title: 'Community Users', desc: 'Users imported from the Ollypedia Community Hub' },
                  { id: 'review', title: 'Movie Reviewers', desc: 'Users who submitted reviews & ratings on movie pages' },
                  { id: 'imported', title: 'CSV Imported Lists', desc: 'Subscribers added via bulk CSV file import' },
                  { id: 'manual', title: 'Specific Email List', desc: 'Type or paste specific email addresses manually' },
                ].map((aud) => (
                  <div
                    key={aud.id}
                    onClick={() => setForm({ ...form, recipientFilter: aud.id })}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: `1px solid ${form.recipientFilter === aud.id ? THEME.gold : THEME.border}`,
                      background: form.recipientFilter === aud.id ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: form.recipientFilter === aud.id ? THEME.gold : '#fff', fontSize: '0.9rem', marginBottom: 4 }}>
                      {aud.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: THEME.muted, lineHeight: 1.4 }}>{aud.desc}</div>
                  </div>
                ))}
              </div>

              {form.recipientFilter === 'manual' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Paste Recipient Emails (comma or newline separated)
                  </label>
                  <textarea
                    rows={4}
                    className="form-input"
                    placeholder="user1@example.com&#10;user2@example.com"
                    value={form.manualRecipientsText}
                    onChange={(e) => setForm({ ...form, manualRecipientsText: e.target.value })}
                    style={{ width: '100%', background: '#0b0f19', borderRadius: 8, fontSize: '0.82rem' }}
                  />
                </div>
              )}

              {/* Recipient Count Indicator */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Estimated audience size:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>{fmtNum(previewCount)} eligible recipients</span>
              </div>
            </div>
          )}

          {/* STEP 3: Template */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                Select the HTML template layout for this campaign:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {templates.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setForm({ ...form, templateId: t._id })}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: `1px solid ${form.templateId === t._id ? THEME.gold : THEME.border}`,
                      background: form.templateId === t._id ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: form.templateId === t._id ? THEME.gold : '#fff', fontSize: '0.9rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: THEME.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject || 'Default Subject'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#0b0f19', borderRadius: 12, padding: 18, border: `1px solid ${THEME.border}`, fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: THEME.muted }}>Campaign:</span>
                  <strong style={{ color: '#fff' }}>{form.name}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: THEME.muted }}>Subject:</span>
                  <span style={{ color: THEME.gold }}>{form.subject}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: THEME.muted }}>From:</span>
                  <span>{form.fromName} &lt;{form.fromEmail}&gt;</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: THEME.muted }}>Template:</span>
                  <span>{selectedTemplate?.name || 'Selected template'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                  <span style={{ color: THEME.muted }}>Recipients:</span>
                  <strong style={{ color: '#34d399' }}>{fmtNum(previewCount)} active subscribers</strong>
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 10, fontSize: '0.8rem', color: '#93c5fd' }}>
                ℹ️ When launched, this campaign will be processed via Brevo SMTP relay with automatic rate-limiting and open/click tracking tags.
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>
              &larr; Back
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10 }}>
            {step < 4 ? (
              <button
                onClick={() => {
                  if (step === 1 && (!form.name.trim() || !form.subject.trim())) {
                    toast('Please enter both campaign name and subject line', 'error');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="btn btn-gold btn-sm"
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                Continue &rarr;
              </button>
            ) : (
              <>
                <button disabled={saving} onClick={() => handleFinish(false)} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>
                  Save as Draft
                </button>
                <button disabled={saving || previewCount === 0} onClick={() => handleFinish(true)} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
                  {saving ? 'Processing…' : '🚀 Send Campaign Now'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL: CAMPAIGN DETAIL & LOGS
// ═══════════════════════════════════════════════════════════════════════════
function CampaignDetailModal({ campaign, recipients, loading, onClose, onRefreshRecipients, toast }) {
  const [filter, setFilter] = useState('all');

  const filteredRecipients = useMemo(() => {
    if (filter === 'all') return recipients;
    if (filter === 'opened') return recipients.filter((r) => r.openedAt);
    if (filter === 'clicked') return recipients.filter((r) => r.clickedAt);
    if (filter === 'failed') return recipients.filter((r) => r.status === 'failed');
    return recipients;
  }, [recipients, filter]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 880,
          width: '96%',
          background: THEME.card,
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{campaign.name}</h3>
              <StatusBadge status={campaign.status} />
            </div>
            <div style={{ fontSize: '0.8rem', color: THEME.muted, marginTop: 4 }}>
              Subject: {campaign.subject} &bull; Sent {fmtDate(campaign.startedAt || campaign.createdAt)}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '18px 24px', background: '#0b0f19', borderBottom: `1px solid ${THEME.border}` }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, textTransform: 'uppercase', fontWeight: 700 }}>Total Recipients</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{fmtNum(campaign.recipientCount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, textTransform: 'uppercase', fontWeight: 700 }}>Successfully Sent</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>{fmtNum(campaign.sentCount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, textTransform: 'uppercase', fontWeight: 700 }}>Opens</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#60a5fa' }}>{fmtNum(campaign.openedCount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: THEME.muted, textTransform: 'uppercase', fontWeight: 700 }}>Clicks</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa' }}>{fmtNum(campaign.clickedCount)}</div>
          </div>
        </div>

        {/* Recipient Logs Table */}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>Recipient Delivery Logs</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'opened', 'clicked', 'failed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    background: filter === f ? THEME.gold : 'rgba(255,255,255,0.06)',
                    color: filter === f ? '#000' : THEME.muted,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${THEME.border}`, borderRadius: 10 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: THEME.muted }}>Loading logs…</div>
            ) : filteredRecipients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: THEME.muted }}>No recipient records found</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#0b0f19', color: THEME.muted, textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Opened</th>
                    <th style={{ padding: '8px 12px' }}>Clicked</th>
                    <th style={{ padding: '8px 12px' }}>Sent At</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Simulate Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{r.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: r.status === 'sent' ? '#34d399' : r.status === 'failed' ? '#ef4444' : '#fbbf24' }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: r.openedAt ? '#34d399' : THEME.subtle }}>
                        {r.openedAt ? fmtDate(r.openedAt) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: r.clickedAt ? '#a78bfa' : THEME.subtle }}>
                        {r.clickedAt ? fmtDate(r.clickedAt) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: THEME.subtle }}>{fmtDate(r.sentAt || r.createdAt)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            disabled={Boolean(r.openedAt)}
                            onClick={async () => {
                              try {
                                await API.adminSimulateCampaignOpen(campaign._id, r._id);
                                if (toast) toast(`Simulated Open for ${r.email}`, 'success');
                                if (onRefreshRecipients) onRefreshRecipients();
                              } catch (e) {
                                if (toast) toast(e.message, 'error');
                              }
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: 4, color: r.openedAt ? '#34d399' : THEME.gold }}
                            title="Simulate email open"
                          >
                            {r.openedAt ? '✓ Opened' : '+ Test Open'}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(r.clickedAt)}
                            onClick={async () => {
                              try {
                                await API.adminSimulateCampaignClick(campaign._id, r._id);
                                if (toast) toast(`Simulated Click for ${r.email}`, 'success');
                                if (onRefreshRecipients) onRefreshRecipients();
                              } catch (e) {
                                if (toast) toast(e.message, 'error');
                              }
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: 4, color: r.clickedAt ? '#a78bfa' : '#60a5fa' }}
                            title="Simulate link click"
                          >
                            {r.clickedAt ? '✓ Clicked' : '+ Test Click'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL: TEMPLATE BUILDER / HTML EDITOR
// ═══════════════════════════════════════════════════════════════════════════
function TemplateEditorModal({ template, onClose, onSaved, toast }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef(null);
  const [html, setHtml] = useState(
    template?.html ||
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ollypedia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f0ece4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #111111; border: 1px solid #2a2a2a; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 32px 24px; text-align: center; border-bottom: 1px solid #2a2a2a; background: radial-gradient(circle at center, rgba(201,151,58,0.12) 0%, transparent 70%);">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 900; color: #c9973a; letter-spacing: 0.05em; text-transform: uppercase;">
                🎬 OLLYPEDIA
              </span>
              <div style="font-size: 11px; color: #888070; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px;">
                The Ultimate Odia Cinema Encyclopedia
              </div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px; font-size: 15px; line-height: 1.65; color: #f0ece4;">
              <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #e8b96a; margin: 0 0 16px;">
                Hello {{firstName}},
              </h2>
              <p style="margin: 0 0 16px; color: #f0ece4;">
                We are excited to share the latest updates, movie releases, and exclusive box office insights from Ollypedia.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="https://www.ollypedia.in/movies" target="_blank" style="background: linear-gradient(135deg, #c9973a, #e8b96a); color: #0a0a0a; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block;">
                  Explore Movies on Ollypedia &rarr;
                </a>
              </div>
              <p style="margin: 0; color: #888070; font-size: 13px;">
                Have questions or feedback? Join our active community at <a href="https://www.ollypedia.in/community" target="_blank" style="color: #c9973a; text-decoration: underline;">ollypedia.in/community</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0d0d0d; border-top: 1px solid #2a2a2a; text-align: center; font-size: 12px; color: #888070;">
              <div>Ollypedia &bull; Dedicated to Odia Cinema &bull; <a href="https://www.ollypedia.in/" target="_blank" style="color: #c9973a; text-decoration: none;">www.ollypedia.in</a></div>
              <div style="margin-top: 10px;">
                <a href="{{unsubscribeUrl}}" style="color: #666; text-decoration: underline; font-size: 11px;">Unsubscribe from these emails</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  );
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('split'); // 'split', 'code', 'preview'

  const textareaRef = useRef(null);

  const insertVariable = (token) => {
    const el = textareaRef.current;
    if (!el) {
      setHtml((prev) => prev + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newHtml = html.substring(0, start) + token + html.substring(end);
    setHtml(newHtml);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  const handleSave = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      const msg = 'Template name is required. Please provide a title before saving.';
      setErrorMsg(msg);
      toast(msg, 'error');
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }
    if (!html.trim()) {
      const msg = 'Template HTML cannot be empty.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    try {
      setSaving(true);
      if (template?._id) {
        await API.adminUpdateEmailTemplate(template._id, { name: name.trim(), subject: subject.trim(), html });
        toast('Template updated successfully!', 'success');
      } else {
        await API.adminCreateEmailTemplate({ name: name.trim(), subject: subject.trim(), html });
        toast('Template created successfully!', 'success');
      }
      onSaved();
    } catch (err) {
      const msg = err.message || 'Failed to save template';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1080,
          width: '96%',
          height: '90vh',
          background: THEME.card,
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {template?._id ? 'Edit Template' : 'New Email Template'}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View switcher */}
            <div style={{ display: 'flex', background: '#0b0f19', borderRadius: 8, padding: 3, border: `1px solid ${THEME.border}` }}>
              {['split', 'code', 'preview'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPreviewMode(m)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    background: previewMode === m ? THEME.gold : 'transparent',
                    color: previewMode === m ? '#000' : THEME.muted,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
          </div>
        </div>

        {/* Inline Error Alert Banner */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <strong>{errorMsg}</strong>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Inputs row */}
        <div style={{ padding: '14px 24px', background: '#0b0f19', borderBottom: `1px solid ${THEME.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: !name.trim() && errorMsg ? '#ef4444' : THEME.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Template Name * {!name.trim() && errorMsg ? '(Required)' : ''}
            </label>
            <input
              ref={nameInputRef}
              className="form-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Weekend Box Office Spotlight"
              style={{
                width: '100%',
                height: 34,
                background: THEME.card,
                borderRadius: 6,
                fontSize: '0.82rem',
                border: !name.trim() && errorMsg ? '1px solid #ef4444' : undefined,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Default Subject Line
            </label>
            <input
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 📊 Ollypedia Weekend Collections Are In!"
              style={{ width: '100%', height: 34, background: THEME.card, borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Variable Insertion Pills */}
        <div style={{ padding: '8px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: THEME.muted, fontWeight: 700 }}>Click to insert token:</span>
          {['{{firstName}}', '{{lastName}}', '{{name}}', '{{email}}', '{{websiteUrl}}', '{{unsubscribeUrl}}'].map((tok) => (
            <button
              key={tok}
              type="button"
              onClick={() => insertVariable(tok)}
              style={{
                fontSize: '0.7rem',
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                color: THEME.gold,
                cursor: 'pointer',
              }}
            >
              {tok}
            </button>
          ))}
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: previewMode === 'split' ? '1fr 1fr' : '1fr', overflow: 'hidden' }}>
          {/* Code Area */}
          {(previewMode === 'split' || previewMode === 'code') && (
            <div style={{ height: '100%', borderRight: previewMode === 'split' ? `1px solid ${THEME.border}` : 'none', display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={textareaRef}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                style={{
                  flex: 1,
                  width: '100%',
                  background: '#07090f',
                  color: '#e2e8f0',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.82rem',
                  padding: 16,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                  tabSize: 2,
                }}
              />
            </div>
          )}

          {/* Live Preview Area */}
          {(previewMode === 'split' || previewMode === 'preview') && (
            <div style={{ height: '100%', background: '#0b0f19', padding: 16, overflowY: 'auto' }}>
              <iframe
                title="Live Sandboxed Preview"
                srcDoc={html}
                sandbox="allow-same-origin"
                style={{ width: '100%', minHeight: '100%', background: '#fff', borderRadius: 8, border: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>
            Cancel
          </button>
          <button disabled={saving} onClick={handleSave} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL: SINGLE SUBSCRIBER ADD
// ═══════════════════════════════════════════════════════════════════════════
function SingleSubscriberModal({ onClose, onAdded, toast }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSaving(true);
      await API.adminAddEmailSubscriber({
        email: email.trim(),
        name: name.trim(),
        source: 'manual',
      });
      toast(`Added ${email} to subscribers!`, 'success');
      onAdded();
    } catch (err) {
      toast(err.message || 'Failed to add subscriber', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}` }}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: '#fff', fontWeight: 800 }}>+ Add Subscriber</span>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Full Name (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Babushaan Mohanty"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', background: '#0b0f19', borderRadius: 8 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
              {saving ? 'Adding…' : 'Add Subscriber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL: CSV SUBSCRIBER IMPORT WITH PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function CsvImportModal({ onClose, onImported, toast }) {
  const [csvRaw, setCsvRaw] = useState('');
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvRaw(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleDryRunPreview = async () => {
    if (!csvRaw.trim()) {
      toast('Please paste or upload CSV data first', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await API.adminImportEmailSubscribers({ csvData: csvRaw, confirm: false });
      setPreview(res.preview || []);
      setStats(res.stats || null);
    } catch (err) {
      toast(err.message || 'Failed to parse CSV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      const res = await API.adminImportEmailSubscribers({ csvData: csvRaw, confirm: true });
      toast(`✅ Imported ${res.written} subscribers successfully!`, 'success');
      onImported();
    } catch (err) {
      toast(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '95%', background: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>📥 Import Subscribers from CSV</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: THEME.muted }}>✕</button>
        </div>

        <p style={{ color: THEME.muted, fontSize: '0.82rem', margin: '0 0 16px', lineHeight: 1.5 }}>
          Your CSV file must include an <strong>email</strong> column header. Optional columns: <strong>name</strong>, <strong>firstName</strong>, <strong>lastName</strong>.
        </p>

        {/* Upload File Input */}
        <div style={{ marginBottom: 14 }}>
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '0.8rem', color: THEME.muted }} />
        </div>

        {/* Paste Box */}
        <textarea
          rows={5}
          className="form-input"
          placeholder="email,name&#10;fan1@gmail.com,Babushaan Fan&#10;fan2@gmail.com,Sabyasachi Fan"
          value={csvRaw}
          onChange={(e) => setCsvRaw(e.target.value)}
          style={{ width: '100%', background: '#0b0f19', borderRadius: 8, fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: 14 }}
        />

        {/* Action button to preview */}
        {!preview && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>Cancel</button>
            <button disabled={loading || !csvRaw.trim()} onClick={handleDryRunPreview} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
              {loading ? 'Analyzing CSV…' : 'Preview Records &rarr;'}
            </button>
          </div>
        )}

        {/* Dry run preview result */}
        {preview && stats && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14, fontSize: '0.75rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                <strong>{stats.add}</strong> New
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                <strong>{stats.resubscribe}</strong> Resubscribe
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                <strong>{stats.duplicate}</strong> Duplicate
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                <strong>{stats.invalid}</strong> Invalid
              </div>
            </div>

            <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${THEME.border}`, borderRadius: 8, marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <tbody>
                  {preview.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 10px', color: '#fff' }}>{p.email}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: p.status === 'add' ? '#34d399' : p.status === 'duplicate' ? '#fbbf24' : '#ef4444' }}>
                        {p.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setPreview(null)} className="btn btn-outline btn-sm" style={{ borderRadius: 8 }}>
                Back to Edit
              </button>
              <button disabled={importing || (stats.add === 0 && stats.resubscribe === 0)} onClick={handleConfirmImport} className="btn btn-gold btn-sm" style={{ borderRadius: 8, fontWeight: 700 }}>
                {importing ? 'Importing…' : `Confirm & Import ${stats.add + stats.resubscribe} Contacts`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
