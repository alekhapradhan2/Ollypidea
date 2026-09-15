import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const THEME = {
  card: "#131826",
  border: "rgba(255, 255, 255, 0.08)",
  gold: "#ffd700",
  goldMuted: "#c9973a",
  text: "#f1f5f9",
  muted: "#94a3b8",
  subtle: "#64748b",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b"
};
function fmtNum(n) {
  if (n === null || n === void 0) return "0";
  return Number(n).toLocaleString("en-IN");
}
function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(d);
  }
}
function StatusBadge({ status }) {
  const styles = {
    draft: { bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)", text: "#94a3b8", label: "Draft" },
    scheduled: { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.35)", text: "#60a5fa", label: "Scheduled" },
    sending: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)", text: "#fbbf24", label: "⚡ Sending" },
    sent: { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.35)", text: "#34d399", label: "✓ Sent" },
    cancelled: { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", text: "#f87171", label: "Cancelled" },
    failed: { bg: "rgba(239, 68, 68, 0.18)", border: "rgba(239, 68, 68, 0.4)", text: "#ef4444", label: "Failed" },
    subscribed: { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)", text: "#34d399", label: "Subscribed" },
    unsubscribed: { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", text: "#f87171", label: "Unsubscribed" },
    bounced: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", text: "#fbbf24", label: "Bounced" }
  };
  const s = styles[status] || { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", text: "#94a3b8", label: status };
  return /* @__PURE__ */ jsx(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text
      },
      children: s.label
    }
  );
}
function EmailMarketingPanel({ onToast }) {
  var _a;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState(null);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("");
  const [subSourceFilter, setSubSourceFilter] = useState("");
  const [singleSubModalOpen, setSingleSubModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailSubj, setTestEmailSubj] = useState("Test Email from Ollypedia Admin");
  const [testEmailFrom, setTestEmailFrom] = useState("");
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailSettings, setEmailSettings] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type = "info") => {
    if (onToast) onToast(msg, type);
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5e3);
  };
  const loadSettings = async () => {
    try {
      const data = await API.adminGetEmailSettings();
      setEmailSettings(data);
      if ((data == null ? void 0 : data.fromEmail) && !testEmailFrom) {
        setTestEmailFrom(data.fromEmail);
      }
    } catch (err) {
      console.warn("[EmailMarketing] loadSettings:", err.message);
    }
  };
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await API.adminGetEmailDashboard();
      setDashboard(data);
    } catch (err) {
      toast(err.message || "Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  };
  const loadCampaigns = async () => {
    try {
      const data = await API.adminGetEmailCampaigns();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      toast(err.message || "Failed to load campaigns", "error");
    }
  };
  const loadTemplates = async () => {
    try {
      const data = await API.adminGetEmailTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      toast(err.message || "Failed to load templates", "error");
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
        source: subSourceFilter
      });
      setSubscribers(data.subscribers || []);
      setSubTotal(data.total || 0);
      setSubPage(page);
    } catch (err) {
      toast(err.message || "Failed to load subscribers", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboard();
      loadCampaigns();
    } else if (activeTab === "campaigns") {
      loadCampaigns();
      loadTemplates();
    } else if (activeTab === "templates") {
      loadTemplates();
    } else if (activeTab === "subscribers") {
      loadSubscribers(1);
    } else if (activeTab === "settings") {
      loadSettings();
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab !== "campaigns") return;
    const hasSending = campaigns.some((c) => c.status === "sending");
    if (!hasSending) return;
    const interval = setInterval(() => {
      loadCampaigns();
    }, 5e3);
    return () => clearInterval(interval);
  }, [activeTab, campaigns]);
  const handleSendTestEmail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmailTo.trim()) {
      toast("Please enter a recipient email address", "error");
      return;
    }
    try {
      setTestEmailSending(true);
      const res = await API.adminSendTestEmail({
        to: testEmailTo.trim(),
        fromEmail: testEmailFrom.trim() || void 0,
        subject: testEmailSubj,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0a0a0a; color: #f0ece4; border-radius: 12px; border: 1px solid #2a2a2a; padding: 28px;">
          <h2 style="color: #c9973a; margin-top: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px;">🎬 Ollypedia Live Test Email</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #f0ece4;">Hello <strong>{{firstName}}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #888070;">
            This is a verified test email sent via <strong>Brevo SMTP Relay</strong> (<code style="color: #c9973a;">smtp-relay.brevo.com:587</code>) from the Ollypedia Admin Portal.
          </p>
          <div style="margin: 20px 0; padding: 14px; background: #111111; border-radius: 8px; border: 1px solid #2a2a2a; font-size: 13px;">
            <div style="color: #888070; margin-bottom: 4px;"><strong>Sender (From):</strong> <span style="color: #f0ece4;">${(res == null ? void 0 : res.fromEmail) || testEmailFrom || "Configured Sender"}</span></div>
            <div style="color: #888070; margin-bottom: 4px;"><strong>Recipient:</strong> <span style="color: #f0ece4;">${testEmailTo}</span></div>
            <div style="color: #888070;"><strong>Timestamp:</strong> <span style="color: #f0ece4;">${(/* @__PURE__ */ new Date()).toLocaleString()}</span></div>
          </div>
          <div style="margin-top: 20px; padding: 12px; background: rgba(201,151,58,0.1); border-radius: 8px; border: 1px solid rgba(201,151,58,0.3); font-size: 12px; color: #e8b96a;">
            ✅ <strong>Deliverability Check:</strong> If this email reached your inbox, your Brevo sender configuration is working properly!
          </div>
        </div>`
      });
      toast(`✅ Test email dispatched to ${testEmailTo} from ${(res == null ? void 0 : res.fromEmail) || testEmailFrom || "sender"}!`, "success");
    } catch (err) {
      toast(err.message || "Failed to send test email. Check your Brevo credentials in .env.", "error");
    } finally {
      setTestEmailSending(false);
    }
  };
  const handleSyncCommunity = async () => {
    if (!window.confirm("Sync all active Ollypedia community users into Email Marketing subscribers?")) return;
    try {
      setLoading(true);
      const res = await API.adminSyncCommunitySubscribers();
      toast(`✅ Synced successfully! Added ${res.synced} new subscribers (${res.existing} already existed).`, "success");
      if (activeTab === "subscribers") loadSubscribers(1);
      if (activeTab === "dashboard") loadDashboard();
    } catch (err) {
      toast(err.message || "Sync failed", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleSyncReviews = async () => {
    if (!window.confirm("Sync all user review emails from movies into Email Marketing subscribers?")) return;
    try {
      setLoading(true);
      const res = await API.adminSyncReviewsSubscribers();
      toast(`✅ Synced successfully! Added ${res.synced} new subscribers from user reviews (${res.existing} already existed).`, "success");
      if (activeTab === "subscribers") loadSubscribers(1);
      if (activeTab === "dashboard") loadDashboard();
    } catch (err) {
      toast(err.message || "Review sync failed", "error");
    } finally {
      setLoading(false);
    }
  };
  function renderDashboard() {
    const subs = (dashboard == null ? void 0 : dashboard.subscribers) || { total: 0, active: 0 };
    const camps = (dashboard == null ? void 0 : dashboard.campaigns) || { sent: 0, emailsSent: 0, emailsOpened: 0, emailsClicked: 0 };
    const openRate = camps.emailsSent > 0 ? Math.round(camps.emailsOpened / camps.emailsSent * 100) : 0;
    const clickRate = camps.emailsOpened > 0 ? Math.round(camps.emailsClicked / camps.emailsOpened * 100) : 0;
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #ffd700, #c9973a)" } }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }, children: "Active Subscribers" }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", fontWeight: 900, color: "#fff" }, children: fmtNum(subs.active) }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: THEME.subtle, marginTop: 6 }, children: [
            "Total database: ",
            /* @__PURE__ */ jsx("strong", { style: { color: THEME.text }, children: fmtNum(subs.total) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#3b82f6" } }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }, children: "Total Emails Sent" }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", fontWeight: 900, color: "#fff" }, children: fmtNum(camps.emailsSent) }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: THEME.subtle, marginTop: 6 }, children: [
            "Across ",
            /* @__PURE__ */ jsx("strong", { style: { color: THEME.text }, children: fmtNum(camps.sent) }),
            " completed campaigns"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#10b981" } }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }, children: "Average Open Rate" }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "2rem", fontWeight: 900, color: "#34d399" }, children: [
            openRate,
            "%"
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: THEME.subtle, marginTop: 6 }, children: [
            /* @__PURE__ */ jsx("strong", { style: { color: THEME.text }, children: fmtNum(camps.emailsOpened) }),
            " unique opens tracked"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#8b5cf6" } }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }, children: "Click-Through Rate" }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "2rem", fontWeight: 900, color: "#a78bfa" }, children: [
            clickRate,
            "%"
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: THEME.subtle, marginTop: 6 }, children: [
            /* @__PURE__ */ jsx("strong", { style: { color: THEME.text }, children: fmtNum(camps.emailsClicked) }),
            " link clicks tracked"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "22px 24px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
              /* @__PURE__ */ jsx("span", { style: { width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" } }),
              /* @__PURE__ */ jsx("span", { style: { fontWeight: 800, fontSize: "1rem", color: "#fff" }, children: "Brevo SMTP Relay Active" })
            ] }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "3px 10px", borderRadius: 20, fontWeight: 700, border: "1px solid rgba(16, 185, 129, 0.3)" }, children: "300 Free Emails / Day" })
          ] }),
          /* @__PURE__ */ jsxs("p", { style: { color: THEME.muted, fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 16px" }, children: [
            "Connected via secure TLS relay (",
            /* @__PURE__ */ jsx("strong", { children: "smtp-relay.brevo.com:587" }),
            "). Campaigns are processed by the automated background queue with automatic batching, rate-limiting, and delivery tracking."
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setTestEmailTo("");
                  setActiveTab("settings");
                },
                className: "btn btn-sm btn-outline",
                style: { borderRadius: 8, fontSize: "0.78rem" },
                children: "⚡ Send SMTP Test Email"
              }
            ),
            /* @__PURE__ */ jsx("button", { onClick: handleSyncReviews, className: "btn btn-sm btn-outline", style: { borderRadius: 8, fontSize: "0.78rem" }, children: "⭐ Sync User Reviews" }),
            /* @__PURE__ */ jsxs("button", { onClick: handleSyncCommunity, className: "btn btn-sm btn-outline", style: { borderRadius: 8, fontSize: "0.78rem" }, children: [
              "🌐 Sync Community Users (",
              subs.total,
              ")"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }, children: "Quick Actions" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setActiveTab("campaigns");
                setWizardOpen(true);
              },
              className: "btn btn-sm btn-gold",
              style: { width: "100%", justifyContent: "center", borderRadius: 8, fontWeight: 700 },
              children: "+ Create Campaign"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setActiveTab("templates");
                setEditingTemplate({ name: "", subject: "", html: "" });
                setTemplateModalOpen(true);
              },
              className: "btn btn-sm btn-outline",
              style: { width: "100%", justifyContent: "center", borderRadius: 8 },
              children: "+ New Template"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setActiveTab("subscribers");
                setCsvImportModalOpen(true);
              },
              className: "btn btn-sm btn-outline",
              style: { width: "100%", justifyContent: "center", borderRadius: 8 },
              children: "📥 Import CSV Contacts"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "24px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, children: [
          /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#fff" }, children: "Recent Campaigns" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setActiveTab("campaigns"), className: "btn btn-ghost btn-sm", style: { fontSize: "0.78rem", color: THEME.gold }, children: "View All →" })
        ] }),
        campaigns.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "40px 0", color: THEME.muted }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", marginBottom: 10 }, children: "✉️" }),
          /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: "0.9rem" }, children: 'No campaigns created yet. Click "+ Create Campaign" to get started.' })
        ] }) : /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { borderBottom: `1px solid ${THEME.border}`, textAlign: "left", color: THEME.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px" }, children: "Campaign Name" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px" }, children: "Status" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px" }, children: "Recipients" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px" }, children: "Opens / Clicks" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px" }, children: "Date" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "10px 14px", textAlign: "right" }, children: "Action" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: campaigns.slice(0, 5).map((c) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid rgba(255,255,255,0.04)" }, children: [
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px", fontWeight: 700, color: "#fff" }, children: [
              /* @__PURE__ */ jsx("div", { children: c.name }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: THEME.muted, fontWeight: 400 }, children: c.subject })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px" }, children: /* @__PURE__ */ jsx(StatusBadge, { status: c.status }) }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px", color: THEME.text }, children: [
              c.sentCount || 0,
              " / ",
              c.recipientCount || 0
            ] }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px", color: THEME.text }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#34d399", fontWeight: 700 }, children: c.openedCount || 0 }),
              " opens",
              /* @__PURE__ */ jsx("span", { style: { color: THEME.subtle, margin: "0 6px" }, children: "•" }),
              /* @__PURE__ */ jsx("span", { style: { color: "#a78bfa", fontWeight: 700 }, children: c.clickedCount || 0 }),
              " clicks"
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px", color: THEME.subtle, fontSize: "0.75rem" }, children: fmtDate(c.completedAt || c.startedAt || c.createdAt) }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px", textAlign: "right" }, children: /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setViewingCampaign(c);
                  loadCampaignRecipients(c._id);
                },
                className: "btn btn-ghost btn-sm",
                style: { fontSize: "0.75rem", color: THEME.gold },
                children: "Details →"
              }
            ) })
          ] }, c._id)) })
        ] }) })
      ] })
    ] });
  }
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchFilter = campaignFilter === "all" || c.status === campaignFilter;
      const matchSearch = !campaignSearch || c.name.toLowerCase().includes(campaignSearch.toLowerCase()) || c.subject.toLowerCase().includes(campaignSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [campaigns, campaignFilter, campaignSearch]);
  const loadCampaignRecipients = async (campaignId) => {
    try {
      setRecipientsLoading(true);
      const data = await API.adminGetCampaignRecipients(campaignId, { limit: 100 });
      setCampaignRecipients(data.recipients || []);
    } catch (err) {
      toast(err.message || "Failed to load recipients", "error");
    } finally {
      setRecipientsLoading(false);
    }
  };
  const handleSendCampaign = async (campaign) => {
    if (!window.confirm(`Are you sure you want to SEND "${campaign.name}" to all eligible subscribers now?`)) return;
    try {
      setLoading(true);
      const res = await API.adminSendEmailCampaign(campaign._id);
      toast(`🚀 Campaign queued! Sending to ${res.recipientCount} recipients in the background.`, "success");
      loadCampaigns();
    } catch (err) {
      toast(err.message || "Failed to send campaign", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm("Cancel this campaign? Pending recipients will not be emailed.")) return;
    try {
      await API.adminCancelEmailCampaign(campaignId);
      toast("Campaign cancelled", "info");
      loadCampaigns();
    } catch (err) {
      toast(err.message || "Failed to cancel", "error");
    }
  };
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Permanently delete this campaign?")) return;
    try {
      await API.adminDeleteEmailCampaign(campaignId);
      toast("Campaign deleted", "info");
      loadCampaigns();
      if ((viewingCampaign == null ? void 0 : viewingCampaign._id) === campaignId) setViewingCampaign(null);
    } catch (err) {
      toast(err.message || "Failed to delete", "error");
    }
  };
  function renderCampaigns() {
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
            /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: THEME.muted, fontSize: "0.8rem" }, children: "🔍" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                style: { paddingLeft: 30, width: 240, height: 36, borderRadius: 8, background: THEME.card, fontSize: "0.82rem" },
                placeholder: "Search campaigns…",
                value: campaignSearch,
                onChange: (e) => setCampaignSearch(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6 }, children: ["all", "draft", "sending", "sent", "cancelled"].map((f) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setCampaignFilter(f),
              style: {
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "capitalize",
                background: campaignFilter === f ? THEME.gold : "rgba(255,255,255,0.06)",
                color: campaignFilter === f ? "#000" : THEME.muted,
                border: "none",
                cursor: "pointer"
              },
              children: f
            },
            f
          )) })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setWizardOpen(true), className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: "+ Create New Campaign" })
      ] }),
      filteredCampaigns.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, color: THEME.muted }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "📬" }),
        /* @__PURE__ */ jsx("h4", { style: { color: "#fff", margin: "0 0 8px" }, children: "No campaigns found" }),
        /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: "0.85rem" }, children: "Create a campaign to engage your Ollypedia audience with newsletters, trailer drops, or box office reports." })
      ] }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: filteredCampaigns.map((c) => {
        var _a2;
        const progressPct = c.recipientCount > 0 ? Math.round((c.sentCount + (c.failedCount || 0)) / c.recipientCount * 100) : 0;
        const isSending = c.status === "sending";
        return /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              background: THEME.card,
              border: `1px solid ${isSending ? "rgba(245, 158, 11, 0.4)" : THEME.border}`,
              borderRadius: 14,
              padding: "20px 24px",
              transition: "all 0.15s ease"
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }, children: [
                    /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }, children: c.name }),
                    /* @__PURE__ */ jsx(StatusBadge, { status: c.status })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.85rem", color: THEME.goldMuted, fontWeight: 600 }, children: [
                    "Subject: ",
                    /* @__PURE__ */ jsx("span", { style: { color: THEME.text }, children: c.subject })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: THEME.subtle, marginTop: 4 }, children: [
                    "Template: ",
                    /* @__PURE__ */ jsx("strong", { style: { color: THEME.muted }, children: ((_a2 = c.templateId) == null ? void 0 : _a2.name) || "Custom" }),
                    " • Audience:",
                    " ",
                    /* @__PURE__ */ jsx("span", { style: { textTransform: "capitalize" }, children: c.recipientFilter || "all" }),
                    " • Created ",
                    fmtDate(c.createdAt)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
                  c.status === "draft" && /* @__PURE__ */ jsx("button", { onClick: () => handleSendCampaign(c), className: "btn btn-sm btn-gold", style: { borderRadius: 8, fontWeight: 700 }, children: "🚀 Send Now" }),
                  isSending && /* @__PURE__ */ jsx("button", { onClick: () => handleCancelCampaign(c._id), className: "btn btn-sm", style: { background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 8 }, children: "Stop / Cancel" }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        setViewingCampaign(c);
                        loadCampaignRecipients(c._id);
                      },
                      className: "btn btn-sm btn-outline",
                      style: { borderRadius: 8 },
                      children: "Analytics & Log"
                    }
                  ),
                  ["draft", "cancelled", "failed"].includes(c.status) && /* @__PURE__ */ jsx("button", { onClick: () => handleDeleteCampaign(c._id), className: "btn btn-sm btn-ghost", style: { color: THEME.danger, padding: "4px 8px" }, title: "Delete campaign", children: "✕" })
                ] })
              ] }),
              isSending && /* @__PURE__ */ jsxs("div", { style: { marginTop: 14, background: "rgba(245, 158, 11, 0.1)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.25)" }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#fbbf24", fontWeight: 700, marginBottom: 6 }, children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    "Queue processing in background (",
                    c.sentCount || 0,
                    " sent / ",
                    c.recipientCount || 0,
                    " total)"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    progressPct,
                    "%"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { style: { height: 6, width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: { height: "100%", width: `${progressPct}%`, background: "#f59e0b", transition: "width 0.3s" } }) })
              ] }),
              c.status === "sent" && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 20, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${THEME.border}`, fontSize: "0.8rem", color: THEME.muted }, children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  "Sent: ",
                  /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: fmtNum(c.sentCount) })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  "Opened: ",
                  /* @__PURE__ */ jsx("strong", { style: { color: "#34d399" }, children: fmtNum(c.openedCount) }),
                  " (",
                  c.sentCount > 0 ? Math.round((c.openedCount || 0) / c.sentCount * 100) : 0,
                  "%)"
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  "Clicked: ",
                  /* @__PURE__ */ jsx("strong", { style: { color: "#a78bfa" }, children: fmtNum(c.clickedCount) }),
                  " (",
                  c.openedCount > 0 ? Math.round((c.clickedCount || 0) / (c.openedCount || 1) * 100) : 0,
                  "%)"
                ] }),
                c.unsubscribedCount > 0 && /* @__PURE__ */ jsxs("div", { children: [
                  "Unsubscribed: ",
                  /* @__PURE__ */ jsx("strong", { style: { color: "#f87171" }, children: fmtNum(c.unsubscribedCount) })
                ] })
              ] })
            ]
          },
          c._id
        );
      }) }),
      wizardOpen && /* @__PURE__ */ jsx(CampaignWizardModal, { onClose: () => setWizardOpen(false), templates, onCreated: () => {
        setWizardOpen(false);
        loadCampaigns();
      }, toast }),
      viewingCampaign && /* @__PURE__ */ jsx(
        CampaignDetailModal,
        {
          campaign: viewingCampaign,
          recipients: campaignRecipients,
          loading: recipientsLoading,
          onClose: () => setViewingCampaign(null),
          onRefreshRecipients: () => {
            loadCampaignRecipients(viewingCampaign._id);
            loadCampaigns();
          },
          toast
        }
      )
    ] });
  }
  const handleDuplicateTemplate = async (id) => {
    try {
      await API.adminDuplicateEmailTemplate(id);
      toast("Template duplicated", "success");
      loadTemplates();
    } catch (err) {
      toast(err.message || "Duplicate failed", "error");
    }
  };
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this email template?")) return;
    try {
      await API.adminDeleteEmailTemplate(id);
      toast("Template deleted", "info");
      loadTemplates();
    } catch (err) {
      toast(err.message || "Delete failed", "error");
    }
  };
  function renderTemplates() {
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff" }, children: "Email Templates" }),
          /* @__PURE__ */ jsx("p", { style: { margin: "4px 0 0", fontSize: "0.82rem", color: THEME.muted }, children: "Responsive HTML layouts with personalized variable placeholders." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: async () => {
                if (!window.confirm("Reset/re-seed official Ollypedia brand email templates (using your exact brand palette & domain routers)?")) return;
                try {
                  await API.adminReseedBrandEmailTemplates();
                  toast("Restored official Ollypedia brand templates!", "success");
                  loadTemplates();
                } catch (err) {
                  toast(err.message || "Failed to reseed templates", "error");
                }
              },
              className: "btn btn-outline btn-sm",
              style: { borderRadius: 8, color: THEME.muted },
              title: "Reset official Ollypedia brand templates",
              children: "🔄 Restore Brand Templates"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setEditingTemplate({ name: "", subject: "", html: "" });
                setTemplateModalOpen(true);
              },
              className: "btn btn-gold btn-sm",
              style: { borderRadius: 8, fontWeight: 700 },
              children: "+ Create Template"
            }
          )
        ] })
      ] }),
      templates.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, color: THEME.muted }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎨" }),
        /* @__PURE__ */ jsx("h4", { style: { color: "#fff", margin: "0 0 8px" }, children: "No templates found" }),
        /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: "0.85rem" }, children: "Create your first responsive template with our visual code builder." })
      ] }) : /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }, children: templates.map((t) => /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            background: THEME.card,
            border: `1px solid ${THEME.border}`,
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "border 0.2s"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { height: 160, background: "#0b0f19", borderBottom: `1px solid ${THEME.border}`, position: "relative", overflow: "hidden" }, children: [
              /* @__PURE__ */ jsx(
                "iframe",
                {
                  title: t.name,
                  srcDoc: t.html,
                  sandbox: "allow-same-origin",
                  style: {
                    width: "200%",
                    height: "200%",
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                    border: "none",
                    pointerEvents: "none"
                  }
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)" } })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1rem", color: "#fff", marginBottom: 4 }, children: t.name }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: THEME.goldMuted, marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: t.subject || "No default subject" }),
              /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }, children: (t.variables || []).slice(0, 4).map((v) => /* @__PURE__ */ jsx("span", { style: { fontSize: "0.68rem", background: "rgba(255,255,255,0.06)", color: THEME.muted, padding: "2px 8px", borderRadius: 6 }, children: `{{${v}}}` }, v)) }),
              /* @__PURE__ */ jsxs("div", { style: { marginTop: "auto", display: "flex", gap: 8, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setPreviewTemplate(t),
                    className: "btn btn-outline btn-sm",
                    style: { flex: 1, fontSize: "0.75rem", borderRadius: 6 },
                    children: "Preview"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => {
                      setEditingTemplate(t);
                      setTemplateModalOpen(true);
                    },
                    className: "btn btn-gold btn-sm",
                    style: { flex: 1, fontSize: "0.75rem", borderRadius: 6, fontWeight: 700 },
                    children: "Edit"
                  }
                ),
                /* @__PURE__ */ jsx("button", { onClick: () => handleDuplicateTemplate(t._id), className: "btn btn-ghost btn-sm", style: { padding: "6px 8px", fontSize: "0.75rem" }, title: "Duplicate", children: "📋" }),
                /* @__PURE__ */ jsx("button", { onClick: () => handleDeleteTemplate(t._id), className: "btn btn-ghost btn-sm", style: { color: THEME.danger, padding: "6px 8px", fontSize: "0.75rem" }, title: "Delete", children: "🗑" })
              ] })
            ] })
          ]
        },
        t._id
      )) }),
      templateModalOpen && /* @__PURE__ */ jsx(
        TemplateEditorModal,
        {
          template: editingTemplate,
          onClose: () => {
            setTemplateModalOpen(false);
            setEditingTemplate(null);
          },
          onSaved: () => {
            setTemplateModalOpen(false);
            setEditingTemplate(null);
            loadTemplates();
          },
          toast
        }
      ),
      previewTemplate && /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: () => setPreviewTemplate(null), style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "modal",
          onClick: (e) => e.stopPropagation(),
          style: { maxWidth: 760, width: "95%", background: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 0, overflow: "hidden" },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { padding: "16px 20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, color: "#fff" }, children: [
                "Preview: ",
                previewTemplate.name
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: () => setPreviewTemplate(null), className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { padding: 20, background: "#0b0f19", maxHeight: "75vh", overflowY: "auto" }, children: /* @__PURE__ */ jsx(
              "iframe",
              {
                title: "Full Preview",
                srcDoc: previewTemplate.html,
                sandbox: "allow-same-origin",
                style: { width: "100%", minHeight: 480, border: "none", borderRadius: 8, background: "#fff" }
              }
            ) })
          ]
        }
      ) })
    ] });
  }
  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm("Delete this subscriber?")) return;
    try {
      await API.adminDeleteEmailSubscriber(id);
      toast("Subscriber removed", "info");
      loadSubscribers(subPage);
    } catch (err) {
      toast(err.message || "Delete failed", "error");
    }
  };
  const handleToggleSubStatus = async (sub) => {
    const nextStatus = sub.status === "subscribed" ? "unsubscribed" : "subscribed";
    try {
      await API.adminUpdateEmailSubscriber(sub._id, { status: nextStatus });
      toast(`Updated status to ${nextStatus}`, "success");
      loadSubscribers(subPage);
    } catch (err) {
      toast(err.message || "Update failed", "error");
    }
  };
  function renderSubscribers() {
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
            /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: THEME.muted, fontSize: "0.8rem" }, children: "🔍" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                style: { paddingLeft: 30, width: 220, height: 36, borderRadius: 8, background: THEME.card, fontSize: "0.82rem" },
                placeholder: "Search email or name…",
                value: subSearch,
                onChange: (e) => setSubSearch(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && loadSubscribers(1)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "form-select",
              style: { height: 36, borderRadius: 8, background: THEME.card, fontSize: "0.82rem", borderColor: THEME.border },
              value: subStatusFilter,
              onChange: (e) => {
                setSubStatusFilter(e.target.value);
              },
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "All Statuses" }),
                /* @__PURE__ */ jsx("option", { value: "subscribed", children: "Subscribed" }),
                /* @__PURE__ */ jsx("option", { value: "unsubscribed", children: "Unsubscribed" }),
                /* @__PURE__ */ jsx("option", { value: "bounced", children: "Bounced" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "form-select",
              style: { height: 36, borderRadius: 8, background: THEME.card, fontSize: "0.82rem", borderColor: THEME.border },
              value: subSourceFilter,
              onChange: (e) => {
                setSubSourceFilter(e.target.value);
              },
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "All Sources" }),
                /* @__PURE__ */ jsx("option", { value: "community", children: "Community (Live)" }),
                /* @__PURE__ */ jsx("option", { value: "review", children: "User Reviews" }),
                /* @__PURE__ */ jsx("option", { value: "import", children: "CSV Import" }),
                /* @__PURE__ */ jsx("option", { value: "manual", children: "Manual" })
              ]
            }
          ),
          /* @__PURE__ */ jsx("button", { onClick: () => loadSubscribers(1), className: "btn btn-sm btn-outline", style: { borderRadius: 8, height: 36 }, children: "Filter" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx("button", { onClick: handleSyncReviews, className: "btn btn-sm btn-outline", style: { borderRadius: 8 }, children: "⭐ Sync User Reviews" }),
          /* @__PURE__ */ jsx("button", { onClick: handleSyncCommunity, className: "btn btn-sm btn-outline", style: { borderRadius: 8 }, children: "🌐 Sync Community Users" }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: API.adminExportEmailSubscribersUrl(),
              target: "_blank",
              rel: "noreferrer",
              className: "btn btn-sm btn-outline",
              style: { borderRadius: 8, textDecoration: "none" },
              children: "📤 Export CSV"
            }
          ),
          /* @__PURE__ */ jsx("button", { onClick: () => setCsvImportModalOpen(true), className: "btn btn-sm btn-outline", style: { borderRadius: 8 }, children: "📥 Import CSV" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setSingleSubModalOpen(true), className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: "+ Add Subscriber" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { borderBottom: `1px solid ${THEME.border}`, background: "rgba(255,255,255,0.02)", textAlign: "left", color: THEME.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 18px" }, children: "Subscriber" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 18px" }, children: "Status" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 18px" }, children: "Source" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 18px" }, children: "Subscribed On" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 18px", textAlign: "right" }, children: "Actions" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: subscribers.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 5, style: { padding: "40px 0", textAlign: "center", color: THEME.muted }, children: "No subscribers found matching your criteria." }) }) : subscribers.map((s) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid rgba(255,255,255,0.04)" }, children: [
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px 18px" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "#fff" }, children: s.email }),
              s.name && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: THEME.muted }, children: s.name })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px" }, children: /* @__PURE__ */ jsx(StatusBadge, { status: s.status }) }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px" }, children: /* @__PURE__ */ jsx(
              "span",
              {
                style: {
                  fontSize: "0.72rem",
                  background: s.source === "review" ? "rgba(255,180,0,0.15)" : s.source === "community" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                  color: s.source === "review" ? "#ffb400" : s.source === "community" ? "#60a5fa" : THEME.muted,
                  border: s.source === "review" ? "1px solid rgba(255,180,0,0.3)" : s.source === "community" ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                  padding: "2px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 700
                },
                children: s.source === "review" ? "⭐ Review" : s.source === "community" ? "🌐 Community" : s.source
              }
            ) }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", color: THEME.subtle, fontSize: "0.75rem" }, children: fmtDate(s.subscribedAt) }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px 18px", textAlign: "right" }, children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleToggleSubStatus(s),
                  className: "btn btn-ghost btn-sm",
                  style: { fontSize: "0.72rem", color: s.status === "subscribed" ? THEME.warning : THEME.success },
                  children: s.status === "subscribed" ? "Unsubscribe" : "Re-subscribe"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleDeleteSubscriber(s._id),
                  className: "btn btn-ghost btn-sm",
                  style: { color: THEME.danger, padding: "4px 8px", fontSize: "0.75rem" },
                  title: "Delete",
                  children: "✕"
                }
              )
            ] })
          ] }, s._id)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "14px 18px", borderTop: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: THEME.muted }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "Showing ",
            subscribers.length,
            " of ",
            subTotal,
            " subscribers"
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                disabled: subPage <= 1,
                onClick: () => loadSubscribers(subPage - 1),
                className: "btn btn-outline btn-sm",
                style: { padding: "4px 12px", fontSize: "0.75rem" },
                children: "← Prev"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                disabled: subPage * 25 >= subTotal,
                onClick: () => loadSubscribers(subPage + 1),
                className: "btn btn-outline btn-sm",
                style: { padding: "4px 12px", fontSize: "0.75rem" },
                children: "Next →"
              }
            )
          ] })
        ] })
      ] }),
      singleSubModalOpen && /* @__PURE__ */ jsx(
        SingleSubscriberModal,
        {
          onClose: () => setSingleSubModalOpen(false),
          onAdded: () => {
            setSingleSubModalOpen(false);
            loadSubscribers(1);
          },
          toast
        }
      ),
      csvImportModalOpen && /* @__PURE__ */ jsx(
        CsvImportModal,
        {
          onClose: () => setCsvImportModalOpen(false),
          onImported: () => {
            setCsvImportModalOpen(false);
            loadSubscribers(1);
          },
          toast
        }
      )
    ] });
  }
  function renderSettings() {
    return /* @__PURE__ */ jsxs("div", { style: { maxWidth: 840 }, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 14,
            padding: "20px 24px",
            marginBottom: 24
          },
          children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 14 }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.6rem", lineHeight: 1 }, children: "⚠️" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h4", { style: { margin: "0 0 6px", color: "#f87171", fontSize: "1.02rem", fontWeight: 800 }, children: "Why Did Local Logs Say “Sent (250 OK: queued)” But No Email Was Received in Inbox?" }),
              /* @__PURE__ */ jsxs("p", { style: { margin: "0 0 10px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6 }, children: [
                "Brevo’s SMTP server accepts any email sent with valid SMTP credentials and immediately replies with ",
                /* @__PURE__ */ jsx("code", { style: { color: "#fbbf24", background: "#0b0f19", padding: "2px 6px", borderRadius: 4 }, children: "250 OK: queued" }),
                ".",
                /* @__PURE__ */ jsx("strong", { children: " However, Brevo will quietly drop or block emails if your “From Email” is NOT a verified sender in your Brevo account." })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { background: "#0b0f19", padding: "12px 14px", borderRadius: 8, border: `1px solid ${THEME.border}` }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 800, fontSize: "0.82rem", marginBottom: 4 }, children: "⚡ Option 1: Instant Fix (No DNS required)" }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: THEME.muted, lineHeight: 1.5 }, children: [
                    "Enter the ",
                    /* @__PURE__ */ jsx("strong", { children: "exact email you used to register on Brevo" }),
                    " (e.g. your Gmail) in the “Sender Email (From)” box below or in ",
                    /* @__PURE__ */ jsx("code", { style: { color: THEME.gold }, children: "BREVO_FROM_EMAIL" }),
                    ". Brevo verifies your account registration email automatically!"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { background: "#0b0f19", padding: "12px 14px", borderRadius: 8, border: `1px solid ${THEME.border}` }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#34d399", fontWeight: 800, fontSize: "0.82rem", marginBottom: 4 }, children: "🏷️ Option 2: Verify noreply@ollypedia.in" }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: THEME.muted, lineHeight: 1.5 }, children: [
                    "Open ",
                    /* @__PURE__ */ jsx("a", { href: "https://app.brevo.com/senders", target: "_blank", rel: "noreferrer", style: { color: "#38bdf8", textDecoration: "underline" }, children: "app.brevo.com/senders" }),
                    " → Click ",
                    /* @__PURE__ */ jsx("strong", { children: "“Add a sender”" }),
                    " → Add ",
                    /* @__PURE__ */ jsx("code", { style: { color: "#34d399" }, children: "noreply@ollypedia.in" }),
                    " → Confirm the 6-digit code Brevo sends to that inbox."
                  ] })
                ] })
              ] })
            ] })
          ] })
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "Active Backend Brevo SMTP Status" }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxs("span", { children: [
              (emailSettings == null ? void 0 : emailSettings.host) || "smtp-relay.brevo.com",
              ":",
              (emailSettings == null ? void 0 : emailSettings.port) || 587
            ] }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: (emailSettings == null ? void 0 : emailSettings.configured) ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: (emailSettings == null ? void 0 : emailSettings.configured) ? "#34d399" : "#ef4444", border: `1px solid ${(emailSettings == null ? void 0 : emailSettings.configured) ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }, children: (emailSettings == null ? void 0 : emailSettings.configured) ? "Credentials Configured" : "Credentials Missing" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: THEME.muted, marginTop: 4 }, children: [
            "Default From: ",
            /* @__PURE__ */ jsx("strong", { style: { color: THEME.gold }, children: (emailSettings == null ? void 0 : emailSettings.fromEmail) || "noreply@ollypedia.in" }),
            " • SMTP User: ",
            /* @__PURE__ */ jsx("code", { style: { color: "#cbd5e1" }, children: (emailSettings == null ? void 0 : emailSettings.smtpUser) || "configured in .env" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: loadSettings, className: "btn btn-outline btn-sm", style: { borderRadius: 8, fontSize: "0.75rem" }, children: "🔄 Refresh Status" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }, children: [
        /* @__PURE__ */ jsx("h3", { style: { margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }, children: "⚡ Send Live Test Email" }),
        /* @__PURE__ */ jsx("p", { style: { color: THEME.muted, fontSize: "0.85rem", margin: "0 0 20px" }, children: "Send a live test message to your personal inbox. Make sure the Sender Email below is verified in your Brevo account." }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSendTestEmail, style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Sender Email (From) *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "email",
                  required: true,
                  className: "form-input",
                  placeholder: "your-brevo-login-email@gmail.com",
                  value: testEmailFrom,
                  onChange: (e) => setTestEmailFrom(e.target.value),
                  style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: THEME.muted, marginTop: 4, display: "block" }, children: "Must be verified in Brevo. Use your Brevo signup email for instant delivery!" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Recipient Email (To) *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "email",
                  required: true,
                  className: "form-input",
                  placeholder: "your-personal-email@gmail.com",
                  value: testEmailTo,
                  onChange: (e) => setTestEmailTo(e.target.value),
                  style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: THEME.muted, marginTop: 4, display: "block" }, children: "The email address where you want to receive the test." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Subject Line" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "form-input",
                placeholder: "Test Email from Ollypedia",
                value: testEmailSubj,
                onChange: (e) => setTestEmailSubj(e.target.value),
                style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("button", { type: "submit", disabled: testEmailSending, className: "btn btn-gold btn-sm", style: { padding: "10px 24px", fontWeight: 700, borderRadius: 8 }, children: testEmailSending ? "Dispatching Test Email…" : "Send Test Email Now" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }, children: [
        /* @__PURE__ */ jsx("h3", { style: { margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }, children: "⚙️ Brevo SMTP Configuration" }),
        /* @__PURE__ */ jsxs("p", { style: { color: THEME.muted, fontSize: "0.85rem", margin: "0 0 16px", lineHeight: 1.6 }, children: [
          "Brevo (formerly Sendinblue) provides 300 emails/day free forever with full SMTP and API support. The backend connects automatically using the following environment variables in your backend ",
          /* @__PURE__ */ jsx("code", { style: { color: THEME.gold }, children: ".env" }),
          " file:"
        ] }),
        /* @__PURE__ */ jsx(
          "pre",
          {
            style: {
              background: "#0b0f19",
              padding: 16,
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              fontSize: "0.82rem",
              color: "#34d399",
              overflowX: "auto",
              lineHeight: 1.6
            },
            children: `# Brevo SMTP Configuration (Ollypedia-Backend/.env)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_account_email@domain.com
BREVO_SMTP_KEY=xsmtpsib-your-smtp-master-key-here
BREVO_FROM_EMAIL=noreply@ollypedia.in
BREVO_FROM_NAME="Ollypedia"`
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { marginTop: 16, padding: "12px 16px", borderRadius: 8, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", fontSize: "0.82rem", color: THEME.muted }, children: [
          /* @__PURE__ */ jsx("strong", { style: { color: THEME.gold }, children: "Where to find your SMTP Key:" }),
          " Log into ",
          /* @__PURE__ */ jsx("a", { href: "https://app.brevo.com", target: "_blank", rel: "noreferrer", style: { color: THEME.gold }, children: "app.brevo.com" }),
          " → Top right account dropdown → ",
          /* @__PURE__ */ jsx("strong", { children: "SMTP & API" }),
          " → Click ",
          /* @__PURE__ */ jsx("strong", { children: "Generate a new SMTP key" }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24 }, children: [
        /* @__PURE__ */ jsx("h3", { style: { margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }, children: "📝 Template Variables Cheatsheet" }),
        /* @__PURE__ */ jsx("p", { style: { color: THEME.muted, fontSize: "0.85rem", margin: "0 0 16px" }, children: "Insert these tokens in your email subjects and HTML templates. They are automatically substituted for each recipient:" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, fontSize: "0.82rem" }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{firstName}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: `Recipient's first name (falls back to "there")` }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{lastName}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: "Recipient's last name" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{name}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: "Full name of recipient" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{email}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: "Recipient's email address" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{websiteUrl}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: "Link to Ollypedia site (https://www.ollypedia.in)" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.gold, fontWeight: 700 }, children: "{{unsubscribeUrl}}" }),
          /* @__PURE__ */ jsx("div", { style: { color: THEME.muted }, children: "Secure 1-click unsubscribe URL with HMAC verification" })
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { style: { padding: "0 32px 60px", color: THEME.text }, children: [
    toasts.length > 0 && /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          position: "fixed",
          top: 24,
          right: 28,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 420,
          pointerEvents: "none"
        },
        children: toasts.map((t) => /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              pointerEvents: "auto",
              padding: "12px 18px",
              borderRadius: 10,
              background: t.type === "success" ? "#064e3b" : t.type === "error" ? "#7f1d1d" : t.type === "warning" ? "#78350f" : "#1e293b",
              border: `1px solid ${t.type === "success" ? "#10b981" : t.type === "error" ? "#ef4444" : t.type === "warning" ? "#f59e0b" : "#64748b"}`,
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: t.msg }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setToasts((prev) => prev.filter((item) => item.id !== t.id)),
                  style: {
                    background: "none",
                    border: "none",
                    color: "#fff",
                    opacity: 0.75,
                    cursor: "pointer",
                    fontSize: "1rem",
                    padding: 0
                  },
                  children: "✕"
                }
              )
            ]
          },
          t.id
        ))
      }
    ),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0 20px", borderBottom: `1px solid ${THEME.border}`, marginBottom: 24, flexWrap: "wrap", gap: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
          /* @__PURE__ */ jsx("h1", { style: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }, children: "📧 Email Marketing" }),
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", fontSize: "0.72rem", fontWeight: 800 }, children: [
            /* @__PURE__ */ jsx("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#34d399" } }),
            " Brevo SMTP"
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { style: { margin: "4px 0 0", fontSize: "0.85rem", color: THEME.muted }, children: "Build responsive HTML campaigns, import subscribers, and deliver targeted Odia cinema newsletters." })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 10 }, children: /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            setActiveTab("campaigns");
            setWizardOpen(true);
          },
          className: "btn btn-gold btn-sm",
          style: { borderRadius: 8, fontWeight: 700 },
          children: "+ New Campaign"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 14, marginBottom: 24, overflowX: "auto" }, children: [
      { key: "dashboard", label: "📊 Dashboard" },
      { key: "campaigns", label: `📢 Campaigns (${campaigns.length})` },
      { key: "templates", label: `📝 Templates (${templates.length})` },
      { key: "subscribers", label: `👥 Subscribers (${((_a = dashboard == null ? void 0 : dashboard.subscribers) == null ? void 0 : _a.active) || subTotal || 0})` },
      { key: "settings", label: "⚙️ Settings & Test" }
    ].map((t) => /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setActiveTab(t.key),
        style: {
          padding: "8px 18px",
          borderRadius: 8,
          fontSize: "0.84rem",
          fontWeight: 700,
          background: activeTab === t.key ? "rgba(255, 215, 0, 0.12)" : "transparent",
          color: activeTab === t.key ? THEME.gold : THEME.muted,
          border: `1px solid ${activeTab === t.key ? "rgba(255, 215, 0, 0.35)" : "transparent"}`,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.15s ease"
        },
        children: t.label
      },
      t.key
    )) }),
    loading && activeTab === "dashboard" ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 60, color: THEME.muted }, children: "⏳ Loading Email Marketing data…" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      activeTab === "dashboard" && renderDashboard(),
      activeTab === "campaigns" && renderCampaigns(),
      activeTab === "templates" && renderTemplates(),
      activeTab === "subscribers" && renderSubscribers(),
      activeTab === "settings" && renderSettings()
    ] })
  ] });
}
function CampaignWizardModal({ onClose, templates, onCreated, toast }) {
  var _a;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    fromName: "Ollypedia",
    fromEmail: "noreply@ollypedia.in",
    replyTo: "",
    recipientFilter: "all",
    manualRecipientsText: "",
    templateId: ((_a = templates[0]) == null ? void 0 : _a._id) || ""
  });
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const manuals = form.manualRecipientsText.split(/[\n,]/).map((e) => e.trim()).filter((e) => e.length > 0);
        const res = await API.adminGetCampaignRecipientCount({
          recipientFilter: form.recipientFilter,
          manualRecipients: manuals
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
    var _a2;
    if (!form.name.trim()) {
      toast("Campaign name is required", "error");
      return;
    }
    if (!form.subject.trim()) {
      toast("Subject line is required", "error");
      return;
    }
    if (!form.templateId) {
      toast("Please select an email template", "error");
      return;
    }
    try {
      setSaving(true);
      const manuals = form.manualRecipientsText.split(/[\n,]/).map((e) => e.trim()).filter((e) => e.length > 0);
      const res = await API.adminCreateEmailCampaign({
        name: form.name.trim(),
        subject: form.subject.trim(),
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        recipientFilter: form.recipientFilter,
        manualRecipients: manuals,
        templateId: form.templateId
      });
      if (andSend && ((_a2 = res.campaign) == null ? void 0 : _a2._id)) {
        await API.adminSendEmailCampaign(res.campaign._id);
        toast("🚀 Campaign created and queued for immediate sending!", "success");
      } else {
        toast("✅ Campaign saved as draft!", "success");
      }
      onCreated();
    } catch (err) {
      toast(err.message || "Failed to create campaign", "error");
    } finally {
      setSaving(false);
    }
  };
  const selectedTemplate = templates.find((t) => t._id === form.templateId);
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "modal",
      onClick: (e) => e.stopPropagation(),
      style: {
        maxWidth: 680,
        width: "95%",
        background: THEME.card,
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        padding: 0,
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxs("div", { style: { padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff" }, children: "Create Email Campaign" }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: THEME.goldMuted, marginTop: 4 }, children: [
              "Step ",
              step,
              " of 4: ",
              step === 1 ? "Campaign Details" : step === 2 ? "Select Audience" : step === 3 ? "Choose Template" : "Review & Launch"
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { height: 3, background: "rgba(255,255,255,0.06)" }, children: /* @__PURE__ */ jsx("div", { style: { height: "100%", width: `${step / 4 * 100}%`, background: THEME.gold, transition: "width 0.25s" } }) }),
        /* @__PURE__ */ jsxs("div", { style: { padding: 24, maxHeight: "65vh", overflowY: "auto" }, children: [
          step === 1 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Campaign Internal Name *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  placeholder: "e.g. Babushaan 2026 Film Announcement",
                  value: form.name,
                  onChange: (e) => setForm({ ...form, name: e.target.value }),
                  style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Email Subject Line *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  placeholder: "e.g. 🎬 Exclusive Trailer Drop: Watch Now on Ollypedia!",
                  value: form.subject,
                  onChange: (e) => setForm({ ...form, subject: e.target.value }),
                  style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Sender Name" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.fromName,
                    onChange: (e) => setForm({ ...form, fromName: e.target.value }),
                    style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Sender Email" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.fromEmail,
                    onChange: (e) => setForm({ ...form, fromEmail: e.target.value }),
                    style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
                  }
                )
              ] })
            ] })
          ] }),
          step === 2 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.85rem", color: THEME.muted }, children: "Choose which subscribers will receive this campaign:" }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }, children: [
              { id: "all", title: "All Active Subscribers", desc: "Sends to all confirmed subscribed users" },
              { id: "community", title: "Community Users", desc: "Users imported from the Ollypedia Community Hub" },
              { id: "review", title: "Movie Reviewers", desc: "Users who submitted reviews & ratings on movie pages" },
              { id: "imported", title: "CSV Imported Lists", desc: "Subscribers added via bulk CSV file import" },
              { id: "manual", title: "Specific Email List", desc: "Type or paste specific email addresses manually" }
            ].map((aud) => /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => setForm({ ...form, recipientFilter: aud.id }),
                style: {
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${form.recipientFilter === aud.id ? THEME.gold : THEME.border}`,
                  background: form.recipientFilter === aud.id ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.15s"
                },
                children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, color: form.recipientFilter === aud.id ? THEME.gold : "#fff", fontSize: "0.9rem", marginBottom: 4 }, children: aud.title }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: THEME.muted, lineHeight: 1.4 }, children: aud.desc })
                ]
              },
              aud.id
            )) }),
            form.recipientFilter === "manual" && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }, children: "Paste Recipient Emails (comma or newline separated)" }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  rows: 4,
                  className: "form-input",
                  placeholder: "user1@example.com\nuser2@example.com",
                  value: form.manualRecipientsText,
                  onChange: (e) => setForm({ ...form, manualRecipientsText: e.target.value }),
                  style: { width: "100%", background: "#0b0f19", borderRadius: 8, fontSize: "0.82rem" }
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.85rem", color: "#cbd5e1" }, children: "Estimated audience size:" }),
              /* @__PURE__ */ jsxs("span", { style: { fontSize: "1.2rem", fontWeight: 900, color: "#34d399" }, children: [
                fmtNum(previewCount),
                " eligible recipients"
              ] })
            ] })
          ] }),
          step === 3 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.85rem", color: THEME.muted }, children: "Select the HTML template layout for this campaign:" }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: templates.map((t) => /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => setForm({ ...form, templateId: t._id }),
                style: {
                  padding: 14,
                  borderRadius: 10,
                  border: `1px solid ${form.templateId === t._id ? THEME.gold : THEME.border}`,
                  background: form.templateId === t._id ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer"
                },
                children: [
                  /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, color: form.templateId === t._id ? THEME.gold : "#fff", fontSize: "0.9rem" }, children: t.name }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: THEME.muted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: t.subject || "Default Subject" })
                ]
              },
              t._id
            )) })
          ] }),
          step === 4 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { background: "#0b0f19", borderRadius: 12, padding: 18, border: `1px solid ${THEME.border}`, fontSize: "0.85rem" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 8 }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: THEME.muted }, children: "Campaign:" }),
                /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: form.name })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 8 }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: THEME.muted }, children: "Subject:" }),
                /* @__PURE__ */ jsx("span", { style: { color: THEME.gold }, children: form.subject })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 8 }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: THEME.muted }, children: "From:" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  form.fromName,
                  " <",
                  form.fromEmail,
                  ">"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 8 }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: THEME.muted }, children: "Template:" }),
                /* @__PURE__ */ jsx("span", { children: (selectedTemplate == null ? void 0 : selectedTemplate.name) || "Selected template" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: THEME.muted }, children: "Recipients:" }),
                /* @__PURE__ */ jsxs("strong", { style: { color: "#34d399" }, children: [
                  fmtNum(previewCount),
                  " active subscribers"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { padding: "12px 16px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 10, fontSize: "0.8rem", color: "#93c5fd" }, children: "ℹ️ When launched, this campaign will be processed via Brevo SMTP relay with automatic rate-limiting and open/click tracking tags." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "16px 24px", borderTop: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          step > 1 ? /* @__PURE__ */ jsx("button", { onClick: () => setStep(step - 1), className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "← Back" }) : /* @__PURE__ */ jsx("div", {}),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 10 }, children: step < 4 ? /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                if (step === 1 && (!form.name.trim() || !form.subject.trim())) {
                  toast("Please enter both campaign name and subject line", "error");
                  return;
                }
                setStep(step + 1);
              },
              className: "btn btn-gold btn-sm",
              style: { borderRadius: 8, fontWeight: 700 },
              children: "Continue →"
            }
          ) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("button", { disabled: saving, onClick: () => handleFinish(false), className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "Save as Draft" }),
            /* @__PURE__ */ jsx("button", { disabled: saving || previewCount === 0, onClick: () => handleFinish(true), className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: saving ? "Processing…" : "🚀 Send Campaign Now" })
          ] }) })
        ] })
      ]
    }
  ) });
}
function CampaignDetailModal({ campaign, recipients, loading, onClose, onRefreshRecipients, toast }) {
  const [filter, setFilter] = useState("all");
  const filteredRecipients = useMemo(() => {
    if (filter === "all") return recipients;
    if (filter === "opened") return recipients.filter((r) => r.openedAt);
    if (filter === "clicked") return recipients.filter((r) => r.clickedAt);
    if (filter === "failed") return recipients.filter((r) => r.status === "failed");
    return recipients;
  }, [recipients, filter]);
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "modal",
      onClick: (e) => e.stopPropagation(),
      style: {
        maxWidth: 880,
        width: "96%",
        background: THEME.card,
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        padding: 0,
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxs("div", { style: { padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
              /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff" }, children: campaign.name }),
              /* @__PURE__ */ jsx(StatusBadge, { status: campaign.status })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.8rem", color: THEME.muted, marginTop: 4 }, children: [
              "Subject: ",
              campaign.subject,
              " • Sent ",
              fmtDate(campaign.startedAt || campaign.createdAt)
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "18px 24px", background: "#0b0f19", borderBottom: `1px solid ${THEME.border}` }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }, children: "Total Recipients" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.4rem", fontWeight: 900, color: "#fff" }, children: fmtNum(campaign.recipientCount) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }, children: "Successfully Sent" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.4rem", fontWeight: 900, color: "#34d399" }, children: fmtNum(campaign.sentCount) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }, children: "Opens" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.4rem", fontWeight: 900, color: "#60a5fa" }, children: fmtNum(campaign.openedCount) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }, children: "Clicks" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.4rem", fontWeight: 900, color: "#a78bfa" }, children: fmtNum(campaign.clickedCount) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: 24 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.9rem", color: "#fff" }, children: "Recipient Delivery Logs" }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6 }, children: ["all", "opened", "clicked", "failed"].map((f) => /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setFilter(f),
                style: {
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  background: filter === f ? THEME.gold : "rgba(255,255,255,0.06)",
                  color: filter === f ? "#000" : THEME.muted,
                  border: "none",
                  cursor: "pointer"
                },
                children: f
              },
              f
            )) })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { maxHeight: 320, overflowY: "auto", border: `1px solid ${THEME.border}`, borderRadius: 10 }, children: loading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 30, color: THEME.muted }, children: "Loading logs…" }) : filteredRecipients.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 30, color: THEME.muted }, children: "No recipient records found" }) : /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }, children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "#0b0f19", color: THEME.muted, textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase" }, children: [
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px" }, children: "Email" }),
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px" }, children: "Status" }),
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px" }, children: "Opened" }),
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px" }, children: "Clicked" }),
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px" }, children: "Sent At" }),
              /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px", textAlign: "right" }, children: "Simulate Tracking" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: filteredRecipients.map((r) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid rgba(255,255,255,0.04)" }, children: [
              /* @__PURE__ */ jsx("td", { style: { padding: "10px 12px", fontWeight: 600, color: "#fff" }, children: r.email }),
              /* @__PURE__ */ jsx("td", { style: { padding: "10px 12px" }, children: /* @__PURE__ */ jsx("span", { style: { color: r.status === "sent" ? "#34d399" : r.status === "failed" ? "#ef4444" : "#fbbf24" }, children: r.status }) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "10px 12px", color: r.openedAt ? "#34d399" : THEME.subtle }, children: r.openedAt ? fmtDate(r.openedAt) : "—" }),
              /* @__PURE__ */ jsx("td", { style: { padding: "10px 12px", color: r.clickedAt ? "#a78bfa" : THEME.subtle }, children: r.clickedAt ? fmtDate(r.clickedAt) : "—" }),
              /* @__PURE__ */ jsx("td", { style: { padding: "10px 12px", color: THEME.subtle }, children: fmtDate(r.sentAt || r.createdAt) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "8px 12px", textAlign: "right" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "inline-flex", gap: 6 }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    disabled: Boolean(r.openedAt),
                    onClick: async () => {
                      try {
                        await API.adminSimulateCampaignOpen(campaign._id, r._id);
                        if (toast) toast(`Simulated Open for ${r.email}`, "success");
                        if (onRefreshRecipients) onRefreshRecipients();
                      } catch (e) {
                        if (toast) toast(e.message, "error");
                      }
                    },
                    className: "btn btn-outline btn-sm",
                    style: { padding: "2px 8px", fontSize: "0.68rem", borderRadius: 4, color: r.openedAt ? "#34d399" : THEME.gold },
                    title: "Simulate email open",
                    children: r.openedAt ? "✓ Opened" : "+ Test Open"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    disabled: Boolean(r.clickedAt),
                    onClick: async () => {
                      try {
                        await API.adminSimulateCampaignClick(campaign._id, r._id);
                        if (toast) toast(`Simulated Click for ${r.email}`, "success");
                        if (onRefreshRecipients) onRefreshRecipients();
                      } catch (e) {
                        if (toast) toast(e.message, "error");
                      }
                    },
                    className: "btn btn-outline btn-sm",
                    style: { padding: "2px 8px", fontSize: "0.68rem", borderRadius: 4, color: r.clickedAt ? "#a78bfa" : "#60a5fa" },
                    title: "Simulate link click",
                    children: r.clickedAt ? "✓ Clicked" : "+ Test Click"
                  }
                )
              ] }) })
            ] }, r._id)) })
          ] }) })
        ] })
      ]
    }
  ) });
}
function TemplateEditorModal({ template, onClose, onSaved, toast }) {
  const [name, setName] = useState((template == null ? void 0 : template.name) || "");
  const [subject, setSubject] = useState((template == null ? void 0 : template.subject) || "");
  const [errorMsg, setErrorMsg] = useState("");
  const nameInputRef = useRef(null);
  const [html, setHtml] = useState(
    (template == null ? void 0 : template.html) || `<!DOCTYPE html>
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
  const [previewMode, setPreviewMode] = useState("split");
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
    setErrorMsg("");
    if (!name.trim()) {
      const msg = "Template name is required. Please provide a title before saving.";
      setErrorMsg(msg);
      toast(msg, "error");
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }
    if (!html.trim()) {
      const msg = "Template HTML cannot be empty.";
      setErrorMsg(msg);
      toast(msg, "error");
      return;
    }
    try {
      setSaving(true);
      if (template == null ? void 0 : template._id) {
        await API.adminUpdateEmailTemplate(template._id, { name: name.trim(), subject: subject.trim(), html });
        toast("Template updated successfully!", "success");
      } else {
        await API.adminCreateEmailTemplate({ name: name.trim(), subject: subject.trim(), html });
        toast("Template created successfully!", "success");
      }
      onSaved();
    } catch (err) {
      const msg = err.message || "Failed to save template";
      setErrorMsg(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "modal",
      onClick: (e) => e.stopPropagation(),
      style: {
        maxWidth: 1080,
        width: "96%",
        height: "90vh",
        background: THEME.card,
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxs("div", { style: { padding: "16px 24px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff" }, children: (template == null ? void 0 : template._id) ? "Edit Template" : "New Email Template" }) }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
            /* @__PURE__ */ jsx("div", { style: { display: "flex", background: "#0b0f19", borderRadius: 8, padding: 3, border: `1px solid ${THEME.border}` }, children: ["split", "code", "preview"].map((m) => /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setPreviewMode(m),
                style: {
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  background: previewMode === m ? THEME.gold : "transparent",
                  color: previewMode === m ? "#000" : THEME.muted,
                  border: "none",
                  cursor: "pointer"
                },
                children: m
              },
              m
            )) }),
            /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
          ] })
        ] }),
        errorMsg && /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              padding: "10px 24px",
              background: "rgba(239, 68, 68, 0.15)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                /* @__PURE__ */ jsx("span", { children: "⚠️" }),
                /* @__PURE__ */ jsx("strong", { children: errorMsg })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setErrorMsg(""),
                  style: { background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "0.9rem" },
                  children: "✕"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { padding: "14px 24px", background: "#0b0f19", borderBottom: `1px solid ${THEME.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { style: { fontSize: "0.72rem", fontWeight: 700, color: !name.trim() && errorMsg ? "#ef4444" : THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 4 }, children: [
              "Template Name * ",
              !name.trim() && errorMsg ? "(Required)" : ""
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                ref: nameInputRef,
                className: "form-input",
                value: name,
                onChange: (e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg("");
                },
                placeholder: "e.g. Weekend Box Office Spotlight",
                style: {
                  width: "100%",
                  height: 34,
                  background: THEME.card,
                  borderRadius: 6,
                  fontSize: "0.82rem",
                  border: !name.trim() && errorMsg ? "1px solid #ef4444" : void 0
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { fontSize: "0.72rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 4 }, children: "Default Subject Line" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                value: subject,
                onChange: (e) => setSubject(e.target.value),
                placeholder: "e.g. 📊 Ollypedia Weekend Collections Are In!",
                style: { width: "100%", height: 34, background: THEME.card, borderRadius: 6, fontSize: "0.82rem" }
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "8px 24px", background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", color: THEME.muted, fontWeight: 700 }, children: "Click to insert token:" }),
          ["{{firstName}}", "{{lastName}}", "{{name}}", "{{email}}", "{{websiteUrl}}", "{{unsubscribeUrl}}"].map((tok) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => insertVariable(tok),
              style: {
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(255, 215, 0, 0.1)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                color: THEME.gold,
                cursor: "pointer"
              },
              children: tok
            },
            tok
          ))
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, display: "grid", gridTemplateColumns: previewMode === "split" ? "1fr 1fr" : "1fr", overflow: "hidden" }, children: [
          (previewMode === "split" || previewMode === "code") && /* @__PURE__ */ jsx("div", { style: { height: "100%", borderRight: previewMode === "split" ? `1px solid ${THEME.border}` : "none", display: "flex", flexDirection: "column" }, children: /* @__PURE__ */ jsx(
            "textarea",
            {
              ref: textareaRef,
              value: html,
              onChange: (e) => setHtml(e.target.value),
              style: {
                flex: 1,
                width: "100%",
                background: "#07090f",
                color: "#e2e8f0",
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: "0.82rem",
                padding: 16,
                border: "none",
                outline: "none",
                resize: "none",
                lineHeight: 1.5,
                tabSize: 2
              }
            }
          ) }),
          (previewMode === "split" || previewMode === "preview") && /* @__PURE__ */ jsx("div", { style: { height: "100%", background: "#0b0f19", padding: 16, overflowY: "auto" }, children: /* @__PURE__ */ jsx(
            "iframe",
            {
              title: "Live Sandboxed Preview",
              srcDoc: html,
              sandbox: "allow-same-origin",
              style: { width: "100%", minHeight: "100%", background: "#fff", borderRadius: 8, border: "none" }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "14px 24px", borderTop: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }, children: [
          /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { disabled: saving, onClick: handleSave, className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: saving ? "Saving…" : "Save Template" })
        ] })
      ]
    }
  ) });
}
function SingleSubscriberModal({ onClose, onAdded, toast }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSaving(true);
      await API.adminAddEmailSubscriber({
        email: email.trim(),
        name: name.trim(),
        source: "manual"
      });
      toast(`Added ${email} to subscribers!`, "success");
      onAdded();
    } catch (err) {
      toast(err.message || "Failed to add subscriber", "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 440, background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}` }, children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsx("span", { className: "modal-title", style: { color: "#fff", fontWeight: 800 }, children: "+ Add Subscriber" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, style: { padding: "16px 0", display: "flex", flexDirection: "column", gap: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }, children: "Email Address *" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "email",
            required: true,
            className: "form-input",
            placeholder: "user@example.com",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }, children: "Full Name (Optional)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            className: "form-input",
            placeholder: "e.g. Babushaan Mohanty",
            value: name,
            onChange: (e) => setName(e.target.value),
            style: { width: "100%", background: "#0b0f19", borderRadius: 8 }
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }, children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: saving, className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: saving ? "Adding…" : "Add Subscriber" })
      ] })
    ] })
  ] }) });
}
function CsvImportModal({ onClose, onImported, toast }) {
  const [csvRaw, setCsvRaw] = useState("");
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const handleFileUpload = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      var _a2;
      setCsvRaw(String(((_a2 = event.target) == null ? void 0 : _a2.result) || ""));
    };
    reader.readAsText(file);
  };
  const handleDryRunPreview = async () => {
    if (!csvRaw.trim()) {
      toast("Please paste or upload CSV data first", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await API.adminImportEmailSubscribers({ csvData: csvRaw, confirm: false });
      setPreview(res.preview || []);
      setStats(res.stats || null);
    } catch (err) {
      toast(err.message || "Failed to parse CSV", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      const res = await API.adminImportEmailSubscribers({ csvData: csvRaw, confirm: true });
      toast(`✅ Imported ${res.written} subscribers successfully!`, "success");
      onImported();
    } catch (err) {
      toast(err.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 1e3 }, children: /* @__PURE__ */ jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 640, width: "95%", background: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 24 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff" }, children: "📥 Import Subscribers from CSV" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-ghost btn-sm", style: { color: THEME.muted }, children: "✕" })
    ] }),
    /* @__PURE__ */ jsxs("p", { style: { color: THEME.muted, fontSize: "0.82rem", margin: "0 0 16px", lineHeight: 1.5 }, children: [
      "Your CSV file must include an ",
      /* @__PURE__ */ jsx("strong", { children: "email" }),
      " column header. Optional columns: ",
      /* @__PURE__ */ jsx("strong", { children: "name" }),
      ", ",
      /* @__PURE__ */ jsx("strong", { children: "firstName" }),
      ", ",
      /* @__PURE__ */ jsx("strong", { children: "lastName" }),
      "."
    ] }),
    /* @__PURE__ */ jsx("div", { style: { marginBottom: 14 }, children: /* @__PURE__ */ jsx("input", { type: "file", accept: ".csv", onChange: handleFileUpload, style: { fontSize: "0.8rem", color: THEME.muted } }) }),
    /* @__PURE__ */ jsx(
      "textarea",
      {
        rows: 5,
        className: "form-input",
        placeholder: "email,name\nfan1@gmail.com,Babushaan Fan\nfan2@gmail.com,Sabyasachi Fan",
        value: csvRaw,
        onChange: (e) => setCsvRaw(e.target.value),
        style: { width: "100%", background: "#0b0f19", borderRadius: 8, fontSize: "0.8rem", fontFamily: "monospace", marginBottom: 14 }
      }
    ),
    !preview && /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { disabled: loading || !csvRaw.trim(), onClick: handleDryRunPreview, className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: loading ? "Analyzing CSV…" : "Preview Records &rarr;" })
    ] }),
    preview && stats && /* @__PURE__ */ jsxs("div", { style: { marginTop: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14, fontSize: "0.75rem" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "8px 10px", borderRadius: 8, textAlign: "center" }, children: [
          /* @__PURE__ */ jsx("strong", { children: stats.add }),
          " New"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", padding: "8px 10px", borderRadius: 8, textAlign: "center" }, children: [
          /* @__PURE__ */ jsx("strong", { children: stats.resubscribe }),
          " Resubscribe"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "8px 10px", borderRadius: 8, textAlign: "center" }, children: [
          /* @__PURE__ */ jsx("strong", { children: stats.duplicate }),
          " Duplicate"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "8px 10px", borderRadius: 8, textAlign: "center" }, children: [
          /* @__PURE__ */ jsx("strong", { children: stats.invalid }),
          " Invalid"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { maxHeight: 180, overflowY: "auto", border: `1px solid ${THEME.border}`, borderRadius: 8, marginBottom: 16 }, children: /* @__PURE__ */ jsx("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }, children: /* @__PURE__ */ jsx("tbody", { children: preview.map((p, idx) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid rgba(255,255,255,0.04)" }, children: [
        /* @__PURE__ */ jsx("td", { style: { padding: "6px 10px", color: "#fff" }, children: p.email }),
        /* @__PURE__ */ jsx("td", { style: { padding: "6px 10px", textAlign: "right", color: p.status === "add" ? "#34d399" : p.status === "duplicate" ? "#fbbf24" : "#ef4444" }, children: p.reason })
      ] }, idx)) }) }) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setPreview(null), className: "btn btn-outline btn-sm", style: { borderRadius: 8 }, children: "Back to Edit" }),
        /* @__PURE__ */ jsx("button", { disabled: importing || stats.add === 0 && stats.resubscribe === 0, onClick: handleConfirmImport, className: "btn btn-gold btn-sm", style: { borderRadius: 8, fontWeight: 700 }, children: importing ? "Importing…" : `Confirm & Import ${stats.add + stats.resubscribe} Contacts` })
      ] })
    ] })
  ] }) });
}
export {
  EmailMarketingPanel as default
};
