import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API } from "../api/api";

const VOTE_LABELS = {
  perfection: { label: "Perfection (Must Watch)", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  go_for_it: { label: "Go For It", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  one_time_watch: { label: "One Time Watch", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  time_waste: { label: "Time Waste", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

function getActivityInfo(act) {
  const type = act.type || "ACTIVITY";
  switch (type) {
    case "REGISTER":
      return {
        icon: "👋",
        title: "Joined Ollypedia Community",
        desc: act.metadata?.snippet || "New community member signed up",
        color: "#c9973a",
        bg: "rgba(201,151,58,0.15)",
      };
    case "VOTE_MOVIE":
      return {
        icon: "🗳️",
        title: "Voted on Movie",
        desc: act.metadata?.snippet || `Voted on ${act.metadata?.movieTitle || "a movie"}`,
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.15)",
      };
    case "CREATE_THREAD":
      return {
        icon: "💬",
        title: "Started Discussion",
        desc: act.metadata?.snippet || `Created discussion in ${act.metadata?.movieTitle || "movie"}`,
        color: "#8b5cf6",
        bg: "rgba(139,92,246,0.15)",
      };
    case "COMMENT":
      return {
        icon: "💭",
        title: "Posted Comment",
        desc: act.metadata?.snippet || "Commented in discussion",
        color: "#ec4899",
        bg: "rgba(236,72,153,0.15)",
      };
    case "LIKE_THREAD":
    case "LIKE_COMMENT":
      return {
        icon: "❤️",
        title: "Liked Content",
        desc: act.metadata?.snippet || "Liked a discussion or comment",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.15)",
      };
    case "QUIZ_COMPLETED":
      return {
        icon: "🏆",
        title: "Completed Quiz",
        desc: act.metadata?.snippet || "Finished an Ollypedia quiz",
        color: "#10b981",
        bg: "rgba(16,185,129,0.15)",
      };
    default:
      return {
        icon: "⚡",
        title: type.replace(/_/g, " "),
        desc: act.metadata?.snippet || JSON.stringify(act.metadata || {}),
        color: "#94a3b8",
        bg: "rgba(148,163,184,0.15)",
      };
  }
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(isoStr);
  }
}

export default function CommunityPanel({ onToast }) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "users" | "activities" | "discussions" | "votes"
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Tab state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSortBy, setUserSortBy] = useState("createdAt");

  // User Profile Modal State
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userModalTab, setUserModalTab] = useState("activities"); // "activities" | "votes" | "discussions" | "comments"

  // Activities Tab state
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [actTotal, setActTotal] = useState(0);
  const [actTypeFilter, setActTypeFilter] = useState("all");
  const [actSearch, setActSearch] = useState("");

  // Discussions Tab state
  const [discussions, setDiscussions] = useState([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [discPage, setDiscPage] = useState(1);
  const [discTotalPages, setDiscTotalPages] = useState(1);
  const [discTotal, setDiscTotal] = useState(0);
  const [discSearch, setDiscSearch] = useState("");
  const [discStatusFilter, setDiscStatusFilter] = useState("all");

  // Votes Tab state
  const [votes, setVotes] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [votesPage, setVotesPage] = useState(1);
  const [votesTotalPages, setVotesTotalPages] = useState(1);
  const [votesTotal, setVotesTotal] = useState(0);
  const [voteTypeFilter, setVoteTypeFilter] = useState("all");
  const [voteBreakdown, setVoteBreakdown] = useState({});

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  // ── 1. Fetch Stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await API.adminGetCommunityStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load community stats:", e);
      onToast?.(e.message || "Failed to load community stats", "error");
    } finally {
      setStatsLoading(false);
    }
  }, [onToast]);

  // ── 2. Fetch Users ──
  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const res = await API.adminGetCommunityUsers({
        page,
        limit: 20,
        q: userSearch,
        status: userStatusFilter,
        role: userRoleFilter,
        sortBy: userSortBy,
        order: "desc",
      });
      setUsers(res.users || []);
      setUsersTotal(res.total || 0);
      setUsersPage(res.page || 1);
      setUsersTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load community users:", e);
      onToast?.(e.message || "Failed to load community users", "error");
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userStatusFilter, userRoleFilter, userSortBy, onToast]);

  // ── 3. Fetch User Detail ──
  const fetchUserDetail = useCallback(async (id) => {
    if (!id) return;
    setUserDetailLoading(true);
    try {
      const res = await API.adminGetCommunityUser(id);
      setUserDetail(res);
    } catch (e) {
      console.error("Failed to load user profile:", e);
      onToast?.(e.message || "Failed to load user details", "error");
    } finally {
      setUserDetailLoading(false);
    }
  }, [onToast]);

  const openUserModal = (id) => {
    setSelectedUserId(id);
    setUserModalTab("activities");
    fetchUserDetail(id);
  };

  const closeUserModal = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  // ── 4. Fetch Activities ──
  const fetchActivities = useCallback(async (page = 1) => {
    setActivitiesLoading(true);
    try {
      const res = await API.adminGetCommunityActivities({
        page,
        limit: 25,
        type: actTypeFilter,
        q: actSearch,
      });
      setActivities(res.activities || []);
      setActTotal(res.total || 0);
      setActPage(res.page || 1);
      setActTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load activities:", e);
      onToast?.(e.message || "Failed to load activities", "error");
    } finally {
      setActivitiesLoading(false);
    }
  }, [actTypeFilter, actSearch, onToast]);

  // ── 5. Fetch Discussions ──
  const fetchDiscussions = useCallback(async (page = 1) => {
    setDiscussionsLoading(true);
    try {
      const res = await API.adminGetCommunityDiscussions({
        page,
        limit: 20,
        q: discSearch,
        status: discStatusFilter,
      });
      setDiscussions(res.discussions || []);
      setDiscTotal(res.total || 0);
      setDiscPage(res.page || 1);
      setDiscTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load discussions:", e);
      onToast?.(e.message || "Failed to load discussions", "error");
    } finally {
      setDiscussionsLoading(false);
    }
  }, [discSearch, discStatusFilter, onToast]);

  // ── 6. Fetch Votes ──
  const fetchVotes = useCallback(async (page = 1) => {
    setVotesLoading(true);
    try {
      const res = await API.adminGetCommunityVotes({
        page,
        limit: 25,
        voteType: voteTypeFilter,
      });
      setVotes(res.votes || []);
      setVotesTotal(res.total || 0);
      setVotesPage(res.page || 1);
      setVotesTotalPages(res.totalPages || 1);
      setVoteBreakdown(res.voteTypeBreakdown || {});
    } catch (e) {
      console.error("Failed to load movie votes:", e);
      onToast?.(e.message || "Failed to load movie votes", "error");
    } finally {
      setVotesLoading(false);
    }
  }, [voteTypeFilter, onToast]);

  // Initial Load and Tab change triggers
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers(1);
    else if (activeTab === "activities") fetchActivities(1);
    else if (activeTab === "discussions") fetchDiscussions(1);
    else if (activeTab === "votes") fetchVotes(1);
    else if (activeTab === "overview") fetchStats();
  }, [activeTab, fetchUsers, fetchActivities, fetchDiscussions, fetchVotes, fetchStats]);

  // ── Actions ──
  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await API.adminUpdateCommunityUserStatus(userId, newStatus);
      onToast?.(`User status updated to "${newStatus}"`, "success");
      fetchUsers(usersPage);
      if (selectedUserId === userId) fetchUserDetail(userId);
      fetchStats();
    } catch (e) {
      onToast?.(e.message || "Failed to update status", "error");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await API.adminUpdateCommunityUserRole(userId, newRole);
      onToast?.(`User role updated to "${newRole}"`, "success");
      fetchUsers(usersPage);
      if (selectedUserId === userId) fetchUserDetail(userId);
    } catch (e) {
      onToast?.(e.message || "Failed to update role", "error");
    }
  };

  const handleDeleteUser = (userId, userName) => {
    setConfirmModal({
      message: `Are you sure you want to completely delete user "${userName || userId}"? This will delete their account and associated activity logs.`,
      onConfirm: async () => {
        try {
          await API.adminDeleteCommunityUser(userId);
          onToast?.("User deleted successfully", "success");
          closeUserModal();
          fetchUsers(usersPage);
          fetchStats();
        } catch (e) {
          onToast?.(e.message || "Failed to delete user", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteDiscussion = (discId, title) => {
    setConfirmModal({
      message: `Delete discussion thread "${title || discId}" and all its comments?`,
      onConfirm: async () => {
        try {
          await API.adminDeleteCommunityDiscussion(discId);
          onToast?.("Discussion deleted", "success");
          fetchDiscussions(discPage);
          fetchStats();
        } catch (e) {
          onToast?.(e.message || "Failed to delete discussion", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleToggleDiscussionPin = async (discId, currentPinned) => {
    try {
      await API.adminUpdateCommunityDiscussion(discId, { pinned: !currentPinned });
      onToast?.(!currentPinned ? "Discussion pinned" : "Discussion unpinned", "success");
      fetchDiscussions(discPage);
    } catch (e) {
      onToast?.(e.message || "Failed to update pin status", "error");
    }
  };

  const handleToggleDiscussionLock = async (discId, currentLocked) => {
    try {
      await API.adminUpdateCommunityDiscussion(discId, { locked: !currentLocked });
      onToast?.(!currentLocked ? "Discussion locked" : "Discussion unlocked", "success");
      fetchDiscussions(discPage);
    } catch (e) {
      onToast?.(e.message || "Failed to update lock status", "error");
    }
  };

  return (
    <div style={{ padding: "24px 28px", color: "var(--text, #e2e8f0)", minHeight: "100vh" }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.8rem" }}>🌐</span>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #f5c518, #c9973a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Community & Users Hub
            </h1>
            <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.15)", border: "1px solid rgba(201,151,58,0.3)", color: "var(--gold, #c9973a)", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
              Live (Port 3000 App)
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Track every user who signs up on Ollypedia, monitor real-time member activities, movie votes, discussions & moderate content.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              if (activeTab === "overview") fetchStats();
              else if (activeTab === "users") fetchUsers(usersPage);
              else if (activeTab === "activities") fetchActivities(actPage);
              else if (activeTab === "discussions") fetchDiscussions(discPage);
              else if (activeTab === "votes") fetchVotes(votesPage);
            }}
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          >
            <span>🔄</span> Refresh Data
          </button>
        </div>
      </div>

      {/* ── NAVIGATION PILLS ── */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, marginBottom: 24, overflowX: "auto" }}>
        {[
          { id: "overview", label: "Overview & Analytics", icon: "📊", badge: null },
          { id: "users", label: "Community Members", icon: "👥", badge: stats?.totalUsers || null },
          { id: "activities", label: "Live Activity Feed", icon: "⚡", badge: stats?.totalActivities || null },
          { id: "discussions", label: "Discussions & Moderation", icon: "💬", badge: stats?.totalDiscussions || null },
          { id: "votes", label: "Movie Votes", icon: "🗳️", badge: stats?.totalVotes || null },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 20,
                border: `1px solid ${isActive ? "var(--gold, #c9973a)" : "rgba(255,255,255,0.08)"}`,
                background: isActive ? "rgba(201,151,58,0.15)" : "rgba(255,255,255,0.02)",
                color: isActive ? "var(--gold, #f5c518)" : "#94a3b8",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.86rem",
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: isActive ? "var(--gold, #c9973a)" : "rgba(255,255,255,0.1)",
                    color: isActive ? "#000" : "#fff",
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & ANALYTICS                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div>
          {/* STATS METRIC CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total Members", value: stats?.totalUsers ?? "—", icon: "👥", color: "#f5c518", sub: `${stats?.activeUsers ?? 0} Active / ${stats?.bannedUsers ?? 0} Banned` },
              { label: "New This Week", value: stats?.newUsersThisWeek ?? "—", icon: "✨", color: "#10b981", sub: `+${stats?.newUsersToday ?? 0} Today` },
              { label: "Total Live Activities", value: stats?.totalActivities ?? "—", icon: "⚡", color: "#3b82f6", sub: "Registrations, Votes, Posts" },
              { label: "Movie Votes Cast", value: stats?.totalVotes ?? "—", icon: "🗳️", color: "#8b5cf6", sub: "Audience sentiment votes" },
              { label: "Discussions & Comments", value: (stats?.totalDiscussions ?? 0) + (stats?.totalComments ?? 0), icon: "💬", color: "#ec4899", sub: `${stats?.totalDiscussions ?? 0} Threads, ${stats?.totalComments ?? 0} Comments` },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg2, #181a20)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>{card.label}</span>
                  <span style={{ fontSize: "1.4rem", padding: 6, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN GRID: RECENT SIGNUPS & RECENT ACTIVITIES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
            {/* RECENT SIGNUPS */}
            <div style={{ background: "var(--bg2, #181a20)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🆕</span> Recent Member Signups
                </h3>
                <button onClick={() => setActiveTab("users")} className="btn btn-ghost btn-sm" style={{ fontSize: "0.78rem", color: "var(--gold)" }}>
                  View All Members →
                </button>
              </div>

              {stats?.recentSignups?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.recentSignups.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => openUserModal(u._id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,151,58,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                          alt={u.displayName || u.username}
                          style={{ width: 38, height: 38, borderRadius: "50%", background: "#222" }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f8fafc" }}>{u.displayName || u.username}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{u.email}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: u.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: u.status === "active" ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                          {u.status}
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>{formatDate(u.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: "0.88rem" }}>No users registered yet.</div>
              )}
            </div>

            {/* LIVE ACTIVITY TICKER */}
            <div style={{ background: "var(--bg2, #181a20)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚡</span> Live Activity Stream
                </h3>
                <button onClick={() => setActiveTab("activities")} className="btn btn-ghost btn-sm" style={{ fontSize: "0.78rem", color: "var(--gold)" }}>
                  Full Stream →
                </button>
              </div>

              {stats?.recentActivities?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.recentActivities.map((act) => {
                    const info = getActivityInfo(act);
                    return (
                      <div
                        key={act._id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 12px",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: info.bg,
                            color: info.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          {info.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "#f8fafc" }}>
                              {act.userId?.displayName || act.userId?.username || "A Member"}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", flexShrink: 0 }}>{formatDate(act.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {info.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: "0.88rem" }}>No activities recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: COMMUNITY MEMBERS DIRECTORY                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div>
          {/* SEARCH & FILTERS BAR */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              background: "var(--bg2, #181a20)",
              padding: "16px 20px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
              alignItems: "center",
            }}
          >
            {/* Search Input */}
            <div style={{ flex: "1 1 240px", position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search username, display name, or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
                style={{ width: "100%", paddingLeft: 34 }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Status:</span>
              <select
                className="form-input"
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setTimeout(() => fetchUsers(1), 0);
                }}
                style={{ width: "auto", padding: "6px 10px" }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="banned">Banned Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            {/* Role Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Role:</span>
              <select
                className="form-input"
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setTimeout(() => fetchUsers(1), 0);
                }}
                style={{ width: "auto", padding: "6px 10px" }}
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Sort By */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sort:</span>
              <select
                className="form-input"
                value={userSortBy}
                onChange={(e) => {
                  setUserSortBy(e.target.value);
                  setTimeout(() => fetchUsers(1), 0);
                }}
                style={{ width: "auto", padding: "6px 10px" }}
              >
                <option value="createdAt">Joined Date</option>
                <option value="voteCount">Movie Votes</option>
                <option value="discussionCount">Discussions</option>
                <option value="commentCount">Comments</option>
              </select>
            </div>

            <button onClick={() => fetchUsers(1)} className="btn btn-gold btn-sm" style={{ padding: "8px 16px" }}>
              Filter
            </button>
          </div>

          {/* USERS TABLE */}
          <div style={{ background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
            {usersLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading members directory...</div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>No community users match your search criteria.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                    <th style={{ padding: "12px 16px" }}>User & Identity</th>
                    <th style={{ padding: "12px 16px" }}>Email</th>
                    <th style={{ padding: "12px 16px" }}>Role</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px" }}>Activity Stats</th>
                    <th style={{ padding: "12px 16px" }}>Joined On</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Identity */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <img
                            src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                            alt={u.displayName || u.username}
                            style={{ width: 38, height: 38, borderRadius: "50%", background: "#222" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: "#f8fafc" }}>{u.displayName || u.username}</div>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: "14px 16px", color: "#cbd5e1" }}>{u.email}</td>

                      {/* Role */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: u.role === "admin" ? "rgba(139,92,246,0.18)" : u.role === "moderator" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
                            color: u.role === "admin" ? "#a78bfa" : u.role === "moderator" ? "#60a5fa" : "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: u.status === "active" ? "rgba(16,185,129,0.15)" : u.status === "banned" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                            color: u.status === "active" ? "#10b981" : u.status === "banned" ? "#ef4444" : "#f59e0b",
                            fontWeight: 700,
                          }}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Stats */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 10, fontSize: "0.78rem" }}>
                          <span title="Movie Votes" style={{ color: "#3b82f6" }}>🗳️ {u.voteCount || 0}</span>
                          <span title="Discussions" style={{ color: "#8b5cf6" }}>💬 {u.discussionCount || 0}</span>
                          <span title="Comments" style={{ color: "#ec4899" }}>💭 {u.commentCount || 0}</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.78rem" }}>{formatDate(u.createdAt)}</td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={() => openUserModal(u._id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px 10px", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            👁️ Profile & Timeline
                          </button>

                          {u.status === "active" ? (
                            <button
                              onClick={() => handleUpdateStatus(u._id, "banned")}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", fontSize: "0.78rem", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                              title="Ban User"
                            >
                              🚫 Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(u._id, "active")}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", fontSize: "0.78rem", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                              title="Unban User"
                            >
                              ✅ Activate
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(u._id, u.displayName || u.username)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px 8px", fontSize: "0.78rem", color: "#94a3b8" }}
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* PAGINATION */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }}>
              <div>Showing {users.length} of {usersTotal} members</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={usersPage <= 1}
                  onClick={() => fetchUsers(usersPage - 1)}
                  className="btn btn-ghost btn-sm"
                  style={{ opacity: usersPage <= 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }}>
                  Page {usersPage} of {usersTotalPages}
                </span>
                <button
                  disabled={usersPage >= usersTotalPages}
                  onClick={() => fetchUsers(usersPage + 1)}
                  className="btn btn-ghost btn-sm"
                  style={{ opacity: usersPage >= usersTotalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: LIVE REAL-TIME ACTIVITY FEED                              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "activities" && (
        <div>
          {/* FILTERS BAR */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, background: "var(--bg2, #181a20)", padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search activity description..."
                value={actSearch}
                onChange={(e) => setActSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchActivities(1)}
                style={{ width: "100%", paddingLeft: 34 }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
            </div>

            {/* Type Filter Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Activities" },
                { id: "REGISTER", label: "👋 Signups" },
                { id: "VOTE_MOVIE", label: "🗳️ Movie Votes" },
                { id: "CREATE_THREAD", label: "💬 Discussions" },
                { id: "COMMENT", label: "💭 Comments" },
                { id: "QUIZ_COMPLETED", label: "🏆 Quizzes" },
              ].map((pill) => {
                const isSelected = actTypeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setActTypeFilter(pill.id);
                      setTimeout(() => fetchActivities(1), 0);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 14,
                      border: `1px solid ${isSelected ? "var(--gold)" : "rgba(255,255,255,0.08)"}`,
                      background: isSelected ? "rgba(201,151,58,0.18)" : "rgba(255,255,255,0.02)",
                      color: isSelected ? "var(--gold)" : "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVITIES STREAM LIST */}
          <div style={{ background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
            {activitiesLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading live activities...</div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>No activity logs recorded for this filter.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activities.map((act) => {
                  const info = getActivityInfo(act);
                  return (
                    <div
                      key={act._id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        padding: "14px 18px",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.05)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: info.bg,
                          color: info.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                          flexShrink: 0,
                        }}
                      >
                        {info.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              onClick={() => act.userId?._id && openUserModal(act.userId._id)}
                              style={{
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                color: "#f8fafc",
                                cursor: act.userId?._id ? "pointer" : "default",
                                textDecoration: act.userId?._id ? "underline" : "none",
                              }}
                            >
                              {act.userId?.displayName || act.userId?.username || "A Member"}
                            </span>
                            {act.userId?.email && <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({act.userId.email})</span>}
                            <span style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: 8, background: info.bg, color: info.color, fontWeight: 700 }}>
                              {info.title}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{formatDate(act.createdAt)}</span>
                        </div>

                        {/* Description / Snippet */}
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>{info.desc}</div>

                        {/* Movie Card Snippet if available */}
                        {act.movieId && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "6px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 6, width: "fit-content", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {act.movieId.posterUrl && <img src={act.movieId.posterUrl} alt="" style={{ width: 20, height: 28, borderRadius: 3, objectFit: "cover" }} />}
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gold)" }}>🎬 {act.movieId.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }}>
              <div>Total Activities: {actTotal}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={actPage <= 1} onClick={() => fetchActivities(actPage - 1)} className="btn btn-ghost btn-sm" style={{ opacity: actPage <= 1 ? 0.4 : 1 }}>
                  ← Prev
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }}>
                  Page {actPage} of {actTotalPages}
                </span>
                <button disabled={actPage >= actTotalPages} onClick={() => fetchActivities(actPage + 1)} className="btn btn-ghost btn-sm" style={{ opacity: actPage >= actTotalPages ? 0.4 : 1 }}>
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: DISCUSSIONS & MODERATION                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "discussions" && (
        <div>
          {/* SEARCH & FILTERS BAR */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, background: "var(--bg2, #181a20)", padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
            <div style={{ flex: "1 1 240px", position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search discussion title, movie, or content..."
                value={discSearch}
                onChange={(e) => setDiscSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDiscussions(1)}
                style={{ width: "100%", paddingLeft: 34 }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Status:</span>
              <select
                className="form-input"
                value={discStatusFilter}
                onChange={(e) => {
                  setDiscStatusFilter(e.target.value);
                  setTimeout(() => fetchDiscussions(1), 0);
                }}
                style={{ width: "auto", padding: "6px 10px" }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <button onClick={() => fetchDiscussions(1)} className="btn btn-gold btn-sm">
              Search
            </button>
          </div>

          {/* DISCUSSIONS LIST */}
          <div style={{ background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
            {discussionsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading discussions...</div>
            ) : discussions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>No discussions found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {discussions.map((d) => (
                  <div
                    key={d._id}
                    style={{
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {d.pinned && <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.2)", color: "var(--gold)", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>📌 PINNED</span>}
                          {d.locked && <span style={{ fontSize: "0.72rem", background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>🔒 LOCKED</span>}
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>{d.title}</h4>
                        </div>

                        {/* Subline */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                          <span>By <strong>@{d.author?.username || d.authorId?.username || "Anonymous"}</strong></span>
                          <span>•</span>
                          <span>🎬 {d.movieTitle || d.movieId?.title || "Movie"}</span>
                          <span>•</span>
                          <span>{formatDate(d.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleToggleDiscussionPin(d._id, d.pinned)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                          title={d.pinned ? "Unpin" : "Pin"}
                        >
                          📌 {d.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          onClick={() => handleToggleDiscussionLock(d._id, d.locked)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                          title={d.locked ? "Unlock" : "Lock"}
                        >
                          🔒 {d.locked ? "Unlock" : "Lock"}
                        </button>
                        <button
                          onClick={() => handleDeleteDiscussion(d._id, d.title)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.78rem", padding: "4px 8px", color: "#ef4444" }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 10, lineHeight: 1.6, background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 6 }}>
                      {d.content}
                    </div>

                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: "0.78rem", color: "#64748b" }}>
                      <span>👍 {d.upvotes || 0} Upvotes</span>
                      <span>💬 {d.commentCount || 0} Comments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: MOVIE VOTES                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === "votes" && (
        <div>
          {/* VOTES BREAKDOWN METRICS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {Object.entries(VOTE_LABELS).map(([key, config]) => (
              <div
                key={key}
                onClick={() => {
                  setVoteTypeFilter(voteTypeFilter === key ? "all" : key);
                  setTimeout(() => fetchVotes(1), 0);
                }}
                style={{
                  background: voteTypeFilter === key ? config.bg : "var(--bg2, #181a20)",
                  border: `1px solid ${voteTypeFilter === key ? config.color : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>{config.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: config.color, marginTop: 4 }}>
                  {voteBreakdown[key] || 0}
                </div>
              </div>
            ))}
          </div>

          {/* VOTES TABLE */}
          <div style={{ background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
            {votesLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading votes...</div>
            ) : votes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>No movie votes recorded.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                    <th style={{ padding: "12px 16px" }}>Member</th>
                    <th style={{ padding: "12px 16px" }}>Movie</th>
                    <th style={{ padding: "12px 16px" }}>Vote Cast</th>
                    <th style={{ padding: "12px 16px" }}>Voted On</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.map((v) => {
                    const voteInfo = VOTE_LABELS[v.voteType] || { label: v.voteType, color: "#94a3b8", bg: "rgba(255,255,255,0.05)" };
                    return (
                      <tr key={v._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img
                              src={v.userId?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${v.userId?.username || "user"}`}
                              alt=""
                              style={{ width: 30, height: 30, borderRadius: "50%" }}
                            />
                            <div>
                              <div
                                onClick={() => v.userId?._id && openUserModal(v.userId._id)}
                                style={{ fontWeight: 700, color: "#f8fafc", cursor: v.userId?._id ? "pointer" : "default" }}
                              >
                                {v.userId?.displayName || v.userId?.username || "Member"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{v.userId?.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {v.movieId?.posterUrl && <img src={v.movieId.posterUrl} alt="" style={{ width: 22, height: 30, borderRadius: 3, objectFit: "cover" }} />}
                            <span style={{ fontWeight: 600, color: "var(--gold)" }}>{v.movieId?.title || "Movie"}</span>
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, background: voteInfo.bg, color: voteInfo.color, fontWeight: 700 }}>
                            {voteInfo.label}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.78rem" }}>{formatDate(v.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* PAGINATION */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }}>
              <div>Total Votes: {votesTotal}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={votesPage <= 1} onClick={() => fetchVotes(votesPage - 1)} className="btn btn-ghost btn-sm" style={{ opacity: votesPage <= 1 ? 0.4 : 1 }}>
                  ← Prev
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }}>
                  Page {votesPage} of {votesTotalPages}
                </span>
                <button disabled={votesPage >= votesTotalPages} onClick={() => fetchVotes(votesPage + 1)} className="btn btn-ghost btn-sm" style={{ opacity: votesPage >= votesTotalPages ? 0.4 : 1 }}>
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* USER PROFILE & TIMELINE MODAL                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {selectedUserId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeUserModal()}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: "90vh", overflowY: "auto", background: "var(--bg2, #181a20)", borderRadius: 14 }}>
            <div className="modal-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
              <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>👤</span> Community Member Profile
              </span>
              <button className="modal-close" onClick={closeUserModal}>×</button>
            </div>

            {userDetailLoading || !userDetail ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading profile & activities...</div>
            ) : (
              <div style={{ padding: "20px 0 10px" }}>
                {/* PROFILE HEADER CARD */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
                  <img
                    src={userDetail.user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userDetail.user?.username}`}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid var(--gold)" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                        {userDetail.user?.displayName || userDetail.user?.username}
                      </h3>
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: userDetail.user?.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: userDetail.user?.status === "active" ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                        {userDetail.user?.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 4 }}>
                      @{userDetail.user?.username} • {userDetail.user?.email}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                      Joined on {formatDate(userDetail.user?.createdAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {userDetail.user?.status === "active" ? (
                      <button
                        onClick={() => handleUpdateStatus(userDetail.user._id, "banned")}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        🚫 Ban User
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(userDetail.user._id, "active")}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                      >
                        ✅ Activate User
                      </button>
                    )}
                  </div>
                </div>

                {/* MODAL TABS */}
                <div style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12, marginBottom: 16 }}>
                  {[
                    { id: "activities", label: `⚡ Activities (${userDetail.activities?.length || 0})` },
                    { id: "votes", label: `🗳️ Movie Votes (${userDetail.votes?.length || 0})` },
                    { id: "discussions", label: `💬 Discussions (${userDetail.discussions?.length || 0})` },
                    { id: "comments", label: `💭 Comments (${userDetail.comments?.length || 0})` },
                  ].map((mtab) => (
                    <button
                      key={mtab.id}
                      onClick={() => setUserModalTab(mtab.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: userModalTab === mtab.id ? "rgba(201,151,58,0.18)" : "transparent",
                        color: userModalTab === mtab.id ? "var(--gold)" : "#94a3b8",
                        fontSize: "0.82rem",
                        fontWeight: userModalTab === mtab.id ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {mtab.label}
                    </button>
                  ))}
                </div>

                {/* MODAL TAB 1: ACTIVITIES TIMELINE */}
                {userModalTab === "activities" && (
                  <div>
                    {userDetail.activities?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                        {userDetail.activities.map((act) => {
                          const info = getActivityInfo(act);
                          return (
                            <div key={act._id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ fontSize: "1.2rem" }}>{info.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.84rem", color: info.color }}>{info.title}</span>
                                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{formatDate(act.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: 2 }}>{info.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }}>No activities recorded yet for this member.</div>
                    )}
                  </div>
                )}

                {/* MODAL TAB 2: MOVIE VOTES */}
                {userModalTab === "votes" && (
                  <div>
                    {userDetail.votes?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                        {userDetail.votes.map((v) => {
                          const voteInfo = VOTE_LABELS[v.voteType] || { label: v.voteType, color: "#94a3b8", bg: "rgba(255,255,255,0.05)" };
                          return (
                            <div key={v._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {v.movieId?.posterUrl && <img src={v.movieId.posterUrl} alt="" style={{ width: 24, height: 32, borderRadius: 4, objectFit: "cover" }} />}
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--gold)" }}>{v.movieId?.title || "Movie"}</div>
                                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{formatDate(v.createdAt)}</div>
                                </div>
                              </div>
                              <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, background: voteInfo.bg, color: voteInfo.color, fontWeight: 700 }}>
                                {voteInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }}>This member has not cast any movie votes yet.</div>
                    )}
                  </div>
                )}

                {/* MODAL TAB 3: DISCUSSIONS */}
                {userModalTab === "discussions" && (
                  <div>
                    {userDetail.discussions?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                        {userDetail.discussions.map((d) => (
                          <div key={d._id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f8fafc" }}>{d.title}</div>
                            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>{d.content}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 6 }}>{formatDate(d.createdAt)} • {d.commentCount || 0} comments</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }}>This member has not created any discussions yet.</div>
                    )}
                  </div>
                )}

                {/* MODAL TAB 4: COMMENTS */}
                {userModalTab === "comments" && (
                  <div>
                    {userDetail.comments?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                        {userDetail.comments.map((c) => (
                          <div key={c._id} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>{c.content}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>{formatDate(c.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }}>This member has not posted any comments yet.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" style={{ maxWidth: 450, background: "var(--bg2, #181a20)", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 12, color: "#f8fafc" }}>Confirmation</div>
            <div style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }}>{confirmModal.message}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={confirmModal.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
