import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const VOTE_LABELS = {
  perfection: { label: "Perfection (Must Watch)", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  go_for_it: { label: "Go For It", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  one_time_watch: { label: "One Time Watch", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  time_waste: { label: "Time Waste", color: "#ef4444", bg: "rgba(239,68,68,0.15)" }
};
function getActivityInfo(act) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const type = act.type || "ACTIVITY";
  switch (type) {
    case "REGISTER":
      return {
        icon: "👋",
        title: "Joined Ollypedia Community",
        desc: ((_a = act.metadata) == null ? void 0 : _a.snippet) || "New community member signed up",
        color: "#c9973a",
        bg: "rgba(201,151,58,0.15)"
      };
    case "VOTE_MOVIE":
      return {
        icon: "🗳️",
        title: "Voted on Movie",
        desc: ((_b = act.metadata) == null ? void 0 : _b.snippet) || `Voted on ${((_c = act.metadata) == null ? void 0 : _c.movieTitle) || "a movie"}`,
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.15)"
      };
    case "CREATE_THREAD":
      return {
        icon: "💬",
        title: "Started Discussion",
        desc: ((_d = act.metadata) == null ? void 0 : _d.snippet) || `Created discussion in ${((_e = act.metadata) == null ? void 0 : _e.movieTitle) || "movie"}`,
        color: "#8b5cf6",
        bg: "rgba(139,92,246,0.15)"
      };
    case "COMMENT":
      return {
        icon: "💭",
        title: "Posted Comment",
        desc: ((_f = act.metadata) == null ? void 0 : _f.snippet) || "Commented in discussion",
        color: "#ec4899",
        bg: "rgba(236,72,153,0.15)"
      };
    case "LIKE_THREAD":
    case "LIKE_COMMENT":
      return {
        icon: "❤️",
        title: "Liked Content",
        desc: ((_g = act.metadata) == null ? void 0 : _g.snippet) || "Liked a discussion or comment",
        color: "#ef4444",
        bg: "rgba(239,68,68,0.15)"
      };
    case "QUIZ_COMPLETED":
      return {
        icon: "🏆",
        title: "Completed Quiz",
        desc: ((_h = act.metadata) == null ? void 0 : _h.snippet) || "Finished an Ollypedia quiz",
        color: "#10b981",
        bg: "rgba(16,185,129,0.15)"
      };
    default:
      return {
        icon: "⚡",
        title: type.replace(/_/g, " "),
        desc: ((_i = act.metadata) == null ? void 0 : _i.snippet) || JSON.stringify(act.metadata || {}),
        color: "#94a3b8",
        bg: "rgba(148,163,184,0.15)"
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
      minute: "2-digit"
    });
  } catch {
    return String(isoStr);
  }
}
function CommunityPanel({ onToast }) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSortBy, setUserSortBy] = useState("createdAt");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userModalTab, setUserModalTab] = useState("activities");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [actTotal, setActTotal] = useState(0);
  const [actTypeFilter, setActTypeFilter] = useState("all");
  const [actSearch, setActSearch] = useState("");
  const [discussions, setDiscussions] = useState([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [discPage, setDiscPage] = useState(1);
  const [discTotalPages, setDiscTotalPages] = useState(1);
  const [discTotal, setDiscTotal] = useState(0);
  const [discSearch, setDiscSearch] = useState("");
  const [discStatusFilter, setDiscStatusFilter] = useState("all");
  const [votes, setVotes] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [votesPage, setVotesPage] = useState(1);
  const [votesTotalPages, setVotesTotalPages] = useState(1);
  const [votesTotal, setVotesTotal] = useState(0);
  const [voteTypeFilter, setVoteTypeFilter] = useState("all");
  const [voteBreakdown, setVoteBreakdown] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await API.adminGetCommunityStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load community stats:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load community stats", "error");
    } finally {
      setStatsLoading(false);
    }
  }, [onToast]);
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
        order: "desc"
      });
      setUsers(res.users || []);
      setUsersTotal(res.total || 0);
      setUsersPage(res.page || 1);
      setUsersTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load community users:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load community users", "error");
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userStatusFilter, userRoleFilter, userSortBy, onToast]);
  const fetchUserDetail = useCallback(async (id) => {
    if (!id) return;
    setUserDetailLoading(true);
    try {
      const res = await API.adminGetCommunityUser(id);
      setUserDetail(res);
    } catch (e) {
      console.error("Failed to load user profile:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load user details", "error");
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
  const fetchActivities = useCallback(async (page = 1) => {
    setActivitiesLoading(true);
    try {
      const res = await API.adminGetCommunityActivities({
        page,
        limit: 25,
        type: actTypeFilter,
        q: actSearch
      });
      setActivities(res.activities || []);
      setActTotal(res.total || 0);
      setActPage(res.page || 1);
      setActTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load activities:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load activities", "error");
    } finally {
      setActivitiesLoading(false);
    }
  }, [actTypeFilter, actSearch, onToast]);
  const fetchDiscussions = useCallback(async (page = 1) => {
    setDiscussionsLoading(true);
    try {
      const res = await API.adminGetCommunityDiscussions({
        page,
        limit: 20,
        q: discSearch,
        status: discStatusFilter
      });
      setDiscussions(res.discussions || []);
      setDiscTotal(res.total || 0);
      setDiscPage(res.page || 1);
      setDiscTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error("Failed to load discussions:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load discussions", "error");
    } finally {
      setDiscussionsLoading(false);
    }
  }, [discSearch, discStatusFilter, onToast]);
  const fetchVotes = useCallback(async (page = 1) => {
    setVotesLoading(true);
    try {
      const res = await API.adminGetCommunityVotes({
        page,
        limit: 25,
        voteType: voteTypeFilter
      });
      setVotes(res.votes || []);
      setVotesTotal(res.total || 0);
      setVotesPage(res.page || 1);
      setVotesTotalPages(res.totalPages || 1);
      setVoteBreakdown(res.voteTypeBreakdown || {});
    } catch (e) {
      console.error("Failed to load movie votes:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load movie votes", "error");
    } finally {
      setVotesLoading(false);
    }
  }, [voteTypeFilter, onToast]);
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
  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await API.adminUpdateCommunityUserStatus(userId, newStatus);
      onToast == null ? void 0 : onToast(`User status updated to "${newStatus}"`, "success");
      fetchUsers(usersPage);
      if (selectedUserId === userId) fetchUserDetail(userId);
      fetchStats();
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message || "Failed to update status", "error");
    }
  };
  const handleDeleteUser = (userId, userName) => {
    setConfirmModal({
      message: `Are you sure you want to completely delete user "${userName || userId}"? This will delete their account and associated activity logs.`,
      onConfirm: async () => {
        try {
          await API.adminDeleteCommunityUser(userId);
          onToast == null ? void 0 : onToast("User deleted successfully", "success");
          closeUserModal();
          fetchUsers(usersPage);
          fetchStats();
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message || "Failed to delete user", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };
  const handleDeleteDiscussion = (discId, title) => {
    setConfirmModal({
      message: `Delete discussion thread "${title || discId}" and all its comments?`,
      onConfirm: async () => {
        try {
          await API.adminDeleteCommunityDiscussion(discId);
          onToast == null ? void 0 : onToast("Discussion deleted", "success");
          fetchDiscussions(discPage);
          fetchStats();
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message || "Failed to delete discussion", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };
  const handleToggleDiscussionPin = async (discId, currentPinned) => {
    try {
      await API.adminUpdateCommunityDiscussion(discId, { pinned: !currentPinned });
      onToast == null ? void 0 : onToast(!currentPinned ? "Discussion pinned" : "Discussion unpinned", "success");
      fetchDiscussions(discPage);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message || "Failed to update pin status", "error");
    }
  };
  const handleToggleDiscussionLock = async (discId, currentLocked) => {
    try {
      await API.adminUpdateCommunityDiscussion(discId, { locked: !currentLocked });
      onToast == null ? void 0 : onToast(!currentLocked ? "Discussion locked" : "Discussion unlocked", "success");
      fetchDiscussions(discPage);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message || "Failed to update lock status", "error");
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: "24px 28px", color: "var(--text, #e2e8f0)", minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.8rem" }, children: "🌐" }),
          /* @__PURE__ */ jsx("h1", { style: { fontSize: "1.6rem", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #f5c518, #c9973a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }, children: "Community & Users Hub" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.15)", border: "1px solid rgba(201,151,58,0.3)", color: "var(--gold, #c9973a)", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }, children: "Live (Port 3000 App)" })
        ] }),
        /* @__PURE__ */ jsx("p", { style: { margin: "6px 0 0", color: "#94a3b8", fontSize: "0.85rem" }, children: "Track every user who signs up on Ollypedia, monitor real-time member activities, movie votes, discussions & moderate content." })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 10 }, children: /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => {
            if (activeTab === "overview") fetchStats();
            else if (activeTab === "users") fetchUsers(usersPage);
            else if (activeTab === "activities") fetchActivities(actPage);
            else if (activeTab === "discussions") fetchDiscussions(discPage);
            else if (activeTab === "votes") fetchVotes(votesPage);
          },
          className: "btn btn-ghost btn-sm",
          style: { display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" },
          children: [
            /* @__PURE__ */ jsx("span", { children: "🔄" }),
            " Refresh Data"
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, marginBottom: 24, overflowX: "auto" }, children: [
      { id: "overview", label: "Overview & Analytics", icon: "📊", badge: null },
      { id: "users", label: "Community Members", icon: "👥", badge: (stats == null ? void 0 : stats.totalUsers) || null },
      { id: "activities", label: "Live Activity Feed", icon: "⚡", badge: (stats == null ? void 0 : stats.totalActivities) || null },
      { id: "discussions", label: "Discussions & Moderation", icon: "💬", badge: (stats == null ? void 0 : stats.totalDiscussions) || null },
      { id: "votes", label: "Movie Votes", icon: "🗳️", badge: (stats == null ? void 0 : stats.totalVotes) || null }
    ].map((tab) => {
      const isActive = activeTab === tab.id;
      return /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setActiveTab(tab.id),
          style: {
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
            whiteSpace: "nowrap"
          },
          children: [
            /* @__PURE__ */ jsx("span", { children: tab.icon }),
            /* @__PURE__ */ jsx("span", { children: tab.label }),
            tab.badge !== null && tab.badge !== void 0 && /* @__PURE__ */ jsx(
              "span",
              {
                style: {
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: isActive ? "var(--gold, #c9973a)" : "rgba(255,255,255,0.1)",
                  color: isActive ? "#000" : "#fff",
                  fontWeight: 700
                },
                children: tab.badge
              }
            )
          ]
        },
        tab.id
      );
    }) }),
    activeTab === "overview" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }, children: [
        { label: "Total Members", value: (stats == null ? void 0 : stats.totalUsers) ?? "—", icon: "👥", color: "#f5c518", sub: `${(stats == null ? void 0 : stats.activeUsers) ?? 0} Active / ${(stats == null ? void 0 : stats.bannedUsers) ?? 0} Banned` },
        { label: "New This Week", value: (stats == null ? void 0 : stats.newUsersThisWeek) ?? "—", icon: "✨", color: "#10b981", sub: `+${(stats == null ? void 0 : stats.newUsersToday) ?? 0} Today` },
        { label: "Total Live Activities", value: (stats == null ? void 0 : stats.totalActivities) ?? "—", icon: "⚡", color: "#3b82f6", sub: "Registrations, Votes, Posts" },
        { label: "Movie Votes Cast", value: (stats == null ? void 0 : stats.totalVotes) ?? "—", icon: "🗳️", color: "#8b5cf6", sub: "Audience sentiment votes" },
        { label: "Discussions & Comments", value: ((stats == null ? void 0 : stats.totalDiscussions) ?? 0) + ((stats == null ? void 0 : stats.totalComments) ?? 0), icon: "💬", color: "#ec4899", sub: `${(stats == null ? void 0 : stats.totalDiscussions) ?? 0} Threads, ${(stats == null ? void 0 : stats.totalComments) ?? 0} Comments` }
      ].map((card, i) => /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            background: "var(--bg2, #181a20)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            position: "relative",
            overflow: "hidden"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }, children: card.label }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem", padding: 6, background: "rgba(255,255,255,0.03)", borderRadius: 8 }, children: card.icon })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", fontWeight: 800, color: card.color, lineHeight: 1.1 }, children: card.value }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "#64748b" }, children: card.sub })
          ]
        },
        i
      )) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2, #181a20)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 24px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [
            /* @__PURE__ */ jsxs("h3", { style: { margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ jsx("span", { children: "🆕" }),
              " Recent Member Signups"
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => setActiveTab("users"), className: "btn btn-ghost btn-sm", style: { fontSize: "0.78rem", color: "var(--gold)" }, children: "View All Members →" })
          ] }),
          ((_a = stats == null ? void 0 : stats.recentSignups) == null ? void 0 : _a.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: stats.recentSignups.map((u) => /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => openUserModal(u._id),
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.04)",
                cursor: "pointer",
                transition: "background 0.15s"
              },
              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.07)",
              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)",
              children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`,
                      alt: u.displayName || u.username,
                      style: { width: 38, height: 38, borderRadius: "50%", background: "#222" }
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", color: "#f8fafc" }, children: u.displayName || u.username }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: u.email })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { textAlign: "right" }, children: [
                  /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: u.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: u.status === "active" ? "#10b981" : "#ef4444", fontWeight: 700 }, children: u.status }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "#64748b", marginTop: 4 }, children: formatDate(u.createdAt) })
                ] })
              ]
            },
            u._id
          )) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: "0.88rem" }, children: "No users registered yet." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2, #181a20)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 24px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [
            /* @__PURE__ */ jsxs("h3", { style: { margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ jsx("span", { children: "⚡" }),
              " Live Activity Stream"
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => setActiveTab("activities"), className: "btn btn-ghost btn-sm", style: { fontSize: "0.78rem", color: "var(--gold)" }, children: "Full Stream →" })
          ] }),
          ((_b = stats == null ? void 0 : stats.recentActivities) == null ? void 0 : _b.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: stats.recentActivities.map((act) => {
            var _a2, _b2;
            const info = getActivityInfo(act);
            return /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.04)"
                },
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: {
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: info.bg,
                        color: info.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        flexShrink: 0
                      },
                      children: info.icon
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }, children: [
                      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: "0.84rem", color: "#f8fafc" }, children: ((_a2 = act.userId) == null ? void 0 : _a2.displayName) || ((_b2 = act.userId) == null ? void 0 : _b2.username) || "A Member" }),
                      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "#64748b", flexShrink: 0 }, children: formatDate(act.createdAt) })
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: info.desc })
                  ] })
                ]
              },
              act._id
            );
          }) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: "0.88rem" }, children: "No activities recorded yet." })
        ] })
      ] })
    ] }),
    activeTab === "users" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            background: "var(--bg2, #181a20)",
            padding: "16px 20px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            alignItems: "center"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { flex: "1 1 240px", position: "relative" }, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  className: "form-input",
                  placeholder: "Search username, display name, or email...",
                  value: userSearch,
                  onChange: (e) => setUserSearch(e.target.value),
                  onKeyDown: (e) => e.key === "Enter" && fetchUsers(1),
                  style: { width: "100%", paddingLeft: 34 }
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }, children: "🔍" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "#94a3b8" }, children: "Status:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "form-input",
                  value: userStatusFilter,
                  onChange: (e) => {
                    setUserStatusFilter(e.target.value);
                    setTimeout(() => fetchUsers(1), 0);
                  },
                  style: { width: "auto", padding: "6px 10px" },
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "all", children: "All Statuses" }),
                    /* @__PURE__ */ jsx("option", { value: "active", children: "Active Only" }),
                    /* @__PURE__ */ jsx("option", { value: "banned", children: "Banned Only" }),
                    /* @__PURE__ */ jsx("option", { value: "suspended", children: "Suspended Only" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "#94a3b8" }, children: "Role:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "form-input",
                  value: userRoleFilter,
                  onChange: (e) => {
                    setUserRoleFilter(e.target.value);
                    setTimeout(() => fetchUsers(1), 0);
                  },
                  style: { width: "auto", padding: "6px 10px" },
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "all", children: "All Roles" }),
                    /* @__PURE__ */ jsx("option", { value: "user", children: "User" }),
                    /* @__PURE__ */ jsx("option", { value: "moderator", children: "Moderator" }),
                    /* @__PURE__ */ jsx("option", { value: "admin", children: "Admin" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "#94a3b8" }, children: "Sort:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "form-input",
                  value: userSortBy,
                  onChange: (e) => {
                    setUserSortBy(e.target.value);
                    setTimeout(() => fetchUsers(1), 0);
                  },
                  style: { width: "auto", padding: "6px 10px" },
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "createdAt", children: "Joined Date" }),
                    /* @__PURE__ */ jsx("option", { value: "voteCount", children: "Movie Votes" }),
                    /* @__PURE__ */ jsx("option", { value: "discussionCount", children: "Discussions" }),
                    /* @__PURE__ */ jsx("option", { value: "commentCount", children: "Comments" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => fetchUsers(1), className: "btn btn-gold btn-sm", style: { padding: "8px 16px" }, children: "Filter" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }, children: [
        usersLoading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#94a3b8" }, children: "Loading members directory..." }) : users.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#64748b" }, children: "No community users match your search criteria." }) : /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "User & Identity" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Email" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Role" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Status" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Activity Stats" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Joined On" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", textAlign: "right" }, children: "Actions" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: users.map((u) => /* @__PURE__ */ jsxs(
            "tr",
            {
              style: { borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" },
              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`,
                      alt: u.displayName || u.username,
                      style: { width: 38, height: 38, borderRadius: "50%", background: "#222" }
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "#f8fafc" }, children: u.displayName || u.username }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: [
                      "@",
                      u.username
                    ] })
                  ] })
                ] }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", color: "#cbd5e1" }, children: u.email }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px" }, children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: u.role === "admin" ? "rgba(139,92,246,0.18)" : u.role === "moderator" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
                      color: u.role === "admin" ? "#a78bfa" : u.role === "moderator" ? "#60a5fa" : "#94a3b8",
                      fontWeight: 700,
                      textTransform: "uppercase"
                    },
                    children: u.role
                  }
                ) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px" }, children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: u.status === "active" ? "rgba(16,185,129,0.15)" : u.status === "banned" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: u.status === "active" ? "#10b981" : u.status === "banned" ? "#ef4444" : "#f59e0b",
                      fontWeight: 700
                    },
                    children: u.status
                  }
                ) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, fontSize: "0.78rem" }, children: [
                  /* @__PURE__ */ jsxs("span", { title: "Movie Votes", style: { color: "#3b82f6" }, children: [
                    "🗳️ ",
                    u.voteCount || 0
                  ] }),
                  /* @__PURE__ */ jsxs("span", { title: "Discussions", style: { color: "#8b5cf6" }, children: [
                    "💬 ",
                    u.discussionCount || 0
                  ] }),
                  /* @__PURE__ */ jsxs("span", { title: "Comments", style: { color: "#ec4899" }, children: [
                    "💭 ",
                    u.commentCount || 0
                  ] })
                ] }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", color: "#64748b", fontSize: "0.78rem" }, children: formatDate(u.createdAt) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", textAlign: "right" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 6 }, children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => openUserModal(u._id),
                      className: "btn btn-ghost btn-sm",
                      style: { padding: "4px 10px", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.1)" },
                      children: "👁️ Profile & Timeline"
                    }
                  ),
                  u.status === "active" ? /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleUpdateStatus(u._id, "banned"),
                      className: "btn btn-ghost btn-sm",
                      style: { padding: "4px 8px", fontSize: "0.78rem", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" },
                      title: "Ban User",
                      children: "🚫 Ban"
                    }
                  ) : /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleUpdateStatus(u._id, "active"),
                      className: "btn btn-ghost btn-sm",
                      style: { padding: "4px 8px", fontSize: "0.78rem", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
                      title: "Unban User",
                      children: "✅ Activate"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleDeleteUser(u._id, u.displayName || u.username),
                      className: "btn btn-ghost btn-sm",
                      style: { padding: "4px 8px", fontSize: "0.78rem", color: "#94a3b8" },
                      title: "Delete User",
                      children: "🗑️"
                    }
                  )
                ] }) })
              ]
            },
            u._id
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "Showing ",
            users.length,
            " of ",
            usersTotal,
            " members"
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                disabled: usersPage <= 1,
                onClick: () => fetchUsers(usersPage - 1),
                className: "btn btn-ghost btn-sm",
                style: { opacity: usersPage <= 1 ? 0.4 : 1 },
                children: "← Prev"
              }
            ),
            /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }, children: [
              "Page ",
              usersPage,
              " of ",
              usersTotalPages
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                disabled: usersPage >= usersTotalPages,
                onClick: () => fetchUsers(usersPage + 1),
                className: "btn btn-ghost btn-sm",
                style: { opacity: usersPage >= usersTotalPages ? 0.4 : 1 },
                children: "Next →"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    activeTab === "activities" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, background: "var(--bg2, #181a20)", padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: "1 1 200px", position: "relative" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              placeholder: "Search activity description...",
              value: actSearch,
              onChange: (e) => setActSearch(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && fetchActivities(1),
              style: { width: "100%", paddingLeft: 34 }
            }
          ),
          /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }, children: "🔍" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
          { id: "all", label: "All Activities" },
          { id: "REGISTER", label: "👋 Signups" },
          { id: "VOTE_MOVIE", label: "🗳️ Movie Votes" },
          { id: "CREATE_THREAD", label: "💬 Discussions" },
          { id: "COMMENT", label: "💭 Comments" },
          { id: "QUIZ_COMPLETED", label: "🏆 Quizzes" }
        ].map((pill) => {
          const isSelected = actTypeFilter === pill.id;
          return /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setActTypeFilter(pill.id);
                setTimeout(() => fetchActivities(1), 0);
              },
              style: {
                padding: "6px 12px",
                borderRadius: 14,
                border: `1px solid ${isSelected ? "var(--gold)" : "rgba(255,255,255,0.08)"}`,
                background: isSelected ? "rgba(201,151,58,0.18)" : "rgba(255,255,255,0.02)",
                color: isSelected ? "var(--gold)" : "#94a3b8",
                fontSize: "0.78rem",
                fontWeight: isSelected ? 700 : 500,
                cursor: "pointer"
              },
              children: pill.label
            },
            pill.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }, children: [
        activitiesLoading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#94a3b8" }, children: "Loading live activities..." }) : activities.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#64748b" }, children: "No activity logs recorded for this filter." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: activities.map((act) => {
          var _a2, _b2, _c2, _d2, _e2;
          const info = getActivityInfo(act);
          return /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "14px 18px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.15s"
              },
              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)",
              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)",
              children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: info.bg,
                      color: info.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.4rem",
                      flexShrink: 0
                    },
                    children: info.icon
                  }
                ),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }, children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          onClick: () => {
                            var _a3;
                            return ((_a3 = act.userId) == null ? void 0 : _a3._id) && openUserModal(act.userId._id);
                          },
                          style: {
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            color: "#f8fafc",
                            cursor: ((_a2 = act.userId) == null ? void 0 : _a2._id) ? "pointer" : "default",
                            textDecoration: ((_b2 = act.userId) == null ? void 0 : _b2._id) ? "underline" : "none"
                          },
                          children: ((_c2 = act.userId) == null ? void 0 : _c2.displayName) || ((_d2 = act.userId) == null ? void 0 : _d2.username) || "A Member"
                        }
                      ),
                      ((_e2 = act.userId) == null ? void 0 : _e2.email) && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.75rem", color: "#64748b" }, children: [
                        "(",
                        act.userId.email,
                        ")"
                      ] }),
                      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", padding: "1px 6px", borderRadius: 8, background: info.bg, color: info.color, fontWeight: 700 }, children: info.title })
                    ] }),
                    /* @__PURE__ */ jsx("span", { style: { fontSize: "0.75rem", color: "#64748b" }, children: formatDate(act.createdAt) })
                  ] }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }, children: info.desc }),
                  act.movieId && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "6px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 6, width: "fit-content", border: "1px solid rgba(255,255,255,0.06)" }, children: [
                    act.movieId.posterUrl && /* @__PURE__ */ jsx("img", { src: act.movieId.posterUrl, alt: "", style: { width: 20, height: 28, borderRadius: 3, objectFit: "cover" } }),
                    /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.78rem", fontWeight: 600, color: "var(--gold)" }, children: [
                      "🎬 ",
                      act.movieId.title
                    ] })
                  ] })
                ] })
              ]
            },
            act._id
          );
        }) }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "Total Activities: ",
            actTotal
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsx("button", { disabled: actPage <= 1, onClick: () => fetchActivities(actPage - 1), className: "btn btn-ghost btn-sm", style: { opacity: actPage <= 1 ? 0.4 : 1 }, children: "← Prev" }),
            /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }, children: [
              "Page ",
              actPage,
              " of ",
              actTotalPages
            ] }),
            /* @__PURE__ */ jsx("button", { disabled: actPage >= actTotalPages, onClick: () => fetchActivities(actPage + 1), className: "btn btn-ghost btn-sm", style: { opacity: actPage >= actTotalPages ? 0.4 : 1 }, children: "Next →" })
          ] })
        ] })
      ] })
    ] }),
    activeTab === "discussions" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, background: "var(--bg2, #181a20)", padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: "1 1 240px", position: "relative" }, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              placeholder: "Search discussion title, movie, or content...",
              value: discSearch,
              onChange: (e) => setDiscSearch(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && fetchDiscussions(1),
              style: { width: "100%", paddingLeft: 34 }
            }
          ),
          /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }, children: "🔍" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "#94a3b8" }, children: "Status:" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "form-input",
              value: discStatusFilter,
              onChange: (e) => {
                setDiscStatusFilter(e.target.value);
                setTimeout(() => fetchDiscussions(1), 0);
              },
              style: { width: "auto", padding: "6px 10px" },
              children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "All" }),
                /* @__PURE__ */ jsx("option", { value: "active", children: "Active" }),
                /* @__PURE__ */ jsx("option", { value: "hidden", children: "Hidden" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => fetchDiscussions(1), className: "btn btn-gold btn-sm", children: "Search" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }, children: discussionsLoading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#94a3b8" }, children: "Loading discussions..." }) : discussions.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#64748b" }, children: "No discussions found." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: discussions.map((d) => {
        var _a2, _b2, _c2;
        return /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              padding: "16px 20px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.05)"
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
                    d.pinned && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.2)", color: "var(--gold)", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }, children: "📌 PINNED" }),
                    d.locked && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }, children: "🔒 LOCKED" }),
                    /* @__PURE__ */ jsx("h4", { style: { margin: 0, fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }, children: d.title })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }, children: [
                    /* @__PURE__ */ jsxs("span", { children: [
                      "By ",
                      /* @__PURE__ */ jsxs("strong", { children: [
                        "@",
                        ((_a2 = d.author) == null ? void 0 : _a2.username) || ((_b2 = d.authorId) == null ? void 0 : _b2.username) || "Anonymous"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("span", { children: "•" }),
                    /* @__PURE__ */ jsxs("span", { children: [
                      "🎬 ",
                      d.movieTitle || ((_c2 = d.movieId) == null ? void 0 : _c2.title) || "Movie"
                    ] }),
                    /* @__PURE__ */ jsx("span", { children: "•" }),
                    /* @__PURE__ */ jsx("span", { children: formatDate(d.createdAt) })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleToggleDiscussionPin(d._id, d.pinned),
                      className: "btn btn-ghost btn-sm",
                      style: { fontSize: "0.78rem", padding: "4px 8px" },
                      title: d.pinned ? "Unpin" : "Pin",
                      children: [
                        "📌 ",
                        d.pinned ? "Unpin" : "Pin"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleToggleDiscussionLock(d._id, d.locked),
                      className: "btn btn-ghost btn-sm",
                      style: { fontSize: "0.78rem", padding: "4px 8px" },
                      title: d.locked ? "Unlock" : "Lock",
                      children: [
                        "🔒 ",
                        d.locked ? "Unlock" : "Lock"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleDeleteDiscussion(d._id, d.title),
                      className: "btn btn-ghost btn-sm",
                      style: { fontSize: "0.78rem", padding: "4px 8px", color: "#ef4444" },
                      title: "Delete",
                      children: "🗑️"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.85rem", color: "#cbd5e1", marginTop: 10, lineHeight: 1.6, background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 6 }, children: d.content }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 14, marginTop: 10, fontSize: "0.78rem", color: "#64748b" }, children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "👍 ",
                  d.upvotes || 0,
                  " Upvotes"
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "💬 ",
                  d.commentCount || 0,
                  " Comments"
                ] })
              ] })
            ]
          },
          d._id
        );
      }) }) })
    ] }),
    activeTab === "votes" && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }, children: Object.entries(VOTE_LABELS).map(([key, config]) => /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => {
            setVoteTypeFilter(voteTypeFilter === key ? "all" : key);
            setTimeout(() => fetchVotes(1), 0);
          },
          style: {
            background: voteTypeFilter === key ? config.bg : "var(--bg2, #181a20)",
            border: `1px solid ${voteTypeFilter === key ? config.color : "rgba(255,255,255,0.06)"}`,
            borderRadius: 10,
            padding: "14px 18px",
            cursor: "pointer"
          },
          children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }, children: config.label }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "1.5rem", fontWeight: 800, color: config.color, marginTop: 4 }, children: voteBreakdown[key] || 0 })
          ]
        },
        key
      )) }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2, #181a20)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }, children: [
        votesLoading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#94a3b8" }, children: "Loading votes..." }) : votes.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#64748b" }, children: "No movie votes recorded." }) : /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Member" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Movie" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Vote Cast" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Voted On" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: votes.map((v) => {
            var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
            const voteInfo = VOTE_LABELS[v.voteType] || { label: v.voteType, color: "#94a3b8", bg: "rgba(255,255,255,0.05)" };
            return /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid rgba(255,255,255,0.04)" }, children: [
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: ((_a2 = v.userId) == null ? void 0 : _a2.avatar) || `https://api.dicebear.com/7.x/identicon/svg?seed=${((_b2 = v.userId) == null ? void 0 : _b2.username) || "user"}`,
                    alt: "",
                    style: { width: 30, height: 30, borderRadius: "50%" }
                  }
                ),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      onClick: () => {
                        var _a3;
                        return ((_a3 = v.userId) == null ? void 0 : _a3._id) && openUserModal(v.userId._id);
                      },
                      style: { fontWeight: 700, color: "#f8fafc", cursor: ((_c2 = v.userId) == null ? void 0 : _c2._id) ? "pointer" : "default" },
                      children: ((_d2 = v.userId) == null ? void 0 : _d2.displayName) || ((_e2 = v.userId) == null ? void 0 : _e2.username) || "Member"
                    }
                  ),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "#64748b" }, children: (_f2 = v.userId) == null ? void 0 : _f2.email })
                ] })
              ] }) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                ((_g2 = v.movieId) == null ? void 0 : _g2.posterUrl) && /* @__PURE__ */ jsx("img", { src: v.movieId.posterUrl, alt: "", style: { width: 22, height: 30, borderRadius: 3, objectFit: "cover" } }),
                /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, color: "var(--gold)" }, children: ((_h2 = v.movieId) == null ? void 0 : _h2.title) || "Movie" })
              ] }) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px" }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, background: voteInfo.bg, color: voteInfo.color, fontWeight: 700 }, children: voteInfo.label }) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", color: "#64748b", fontSize: "0.78rem" }, children: formatDate(v.createdAt) })
            ] }, v._id);
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.82rem", color: "#94a3b8" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "Total Votes: ",
            votesTotal
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsx("button", { disabled: votesPage <= 1, onClick: () => fetchVotes(votesPage - 1), className: "btn btn-ghost btn-sm", style: { opacity: votesPage <= 1 ? 0.4 : 1 }, children: "← Prev" }),
            /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 700 }, children: [
              "Page ",
              votesPage,
              " of ",
              votesTotalPages
            ] }),
            /* @__PURE__ */ jsx("button", { disabled: votesPage >= votesTotalPages, onClick: () => fetchVotes(votesPage + 1), className: "btn btn-ghost btn-sm", style: { opacity: votesPage >= votesTotalPages ? 0.4 : 1 }, children: "Next →" })
          ] })
        ] })
      ] })
    ] }),
    selectedUserId && /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => e.target === e.currentTarget && closeUserModal(), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 780, maxHeight: "90vh", overflowY: "auto", background: "var(--bg2, #181a20)", borderRadius: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "modal-header", style: { borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }, children: [
        /* @__PURE__ */ jsxs("span", { className: "modal-title", style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsx("span", { children: "👤" }),
          " Community Member Profile"
        ] }),
        /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: closeUserModal, children: "×" })
      ] }),
      userDetailLoading || !userDetail ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "60px 0", color: "#94a3b8" }, children: "Loading profile & activities..." }) : /* @__PURE__ */ jsxs("div", { style: { padding: "20px 0 10px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }, children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: ((_c = userDetail.user) == null ? void 0 : _c.avatar) || `https://api.dicebear.com/7.x/identicon/svg?seed=${(_d = userDetail.user) == null ? void 0 : _d.username}`,
              alt: "",
              style: { width: 64, height: 64, borderRadius: "50%", border: "2px solid var(--gold)" }
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
              /* @__PURE__ */ jsx("h3", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }, children: ((_e = userDetail.user) == null ? void 0 : _e.displayName) || ((_f = userDetail.user) == null ? void 0 : _f.username) }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: ((_g = userDetail.user) == null ? void 0 : _g.status) === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: ((_h = userDetail.user) == null ? void 0 : _h.status) === "active" ? "#10b981" : "#ef4444", fontWeight: 700 }, children: (_i = userDetail.user) == null ? void 0 : _i.status })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.82rem", color: "#94a3b8", marginTop: 4 }, children: [
              "@",
              (_j = userDetail.user) == null ? void 0 : _j.username,
              " • ",
              (_k = userDetail.user) == null ? void 0 : _k.email
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: "#64748b", marginTop: 4 }, children: [
              "Joined on ",
              formatDate((_l = userDetail.user) == null ? void 0 : _l.createdAt)
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: ((_m = userDetail.user) == null ? void 0 : _m.status) === "active" ? /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleUpdateStatus(userDetail.user._id, "banned"),
              className: "btn btn-ghost btn-sm",
              style: { color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" },
              children: "🚫 Ban User"
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => handleUpdateStatus(userDetail.user._id, "active"),
              className: "btn btn-ghost btn-sm",
              style: { color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
              children: "✅ Activate User"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12, marginBottom: 16 }, children: [
          { id: "activities", label: `⚡ Activities (${((_n = userDetail.activities) == null ? void 0 : _n.length) || 0})` },
          { id: "votes", label: `🗳️ Movie Votes (${((_o = userDetail.votes) == null ? void 0 : _o.length) || 0})` },
          { id: "discussions", label: `💬 Discussions (${((_p = userDetail.discussions) == null ? void 0 : _p.length) || 0})` },
          { id: "comments", label: `💭 Comments (${((_q = userDetail.comments) == null ? void 0 : _q.length) || 0})` }
        ].map((mtab) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setUserModalTab(mtab.id),
            style: {
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: userModalTab === mtab.id ? "rgba(201,151,58,0.18)" : "transparent",
              color: userModalTab === mtab.id ? "var(--gold)" : "#94a3b8",
              fontSize: "0.82rem",
              fontWeight: userModalTab === mtab.id ? 700 : 500,
              cursor: "pointer"
            },
            children: mtab.label
          },
          mtab.id
        )) }),
        userModalTab === "activities" && /* @__PURE__ */ jsx("div", { children: ((_r = userDetail.activities) == null ? void 0 : _r.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }, children: userDetail.activities.map((act) => {
          const info = getActivityInfo(act);
          return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.2rem" }, children: info.icon }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: "0.84rem", color: info.color }, children: info.title }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", color: "#64748b" }, children: formatDate(act.createdAt) })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", color: "#cbd5e1", marginTop: 2 }, children: info.desc })
            ] })
          ] }, act._id);
        }) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }, children: "No activities recorded yet for this member." }) }),
        userModalTab === "votes" && /* @__PURE__ */ jsx("div", { children: ((_s = userDetail.votes) == null ? void 0 : _s.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }, children: userDetail.votes.map((v) => {
          var _a2, _b2;
          const voteInfo = VOTE_LABELS[v.voteType] || { label: v.voteType, color: "#94a3b8", bg: "rgba(255,255,255,0.05)" };
          return /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
              ((_a2 = v.movieId) == null ? void 0 : _a2.posterUrl) && /* @__PURE__ */ jsx("img", { src: v.movieId.posterUrl, alt: "", style: { width: 24, height: 32, borderRadius: 4, objectFit: "cover" } }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", color: "var(--gold)" }, children: ((_b2 = v.movieId) == null ? void 0 : _b2.title) || "Movie" }),
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "#64748b" }, children: formatDate(v.createdAt) })
              ] })
            ] }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, background: voteInfo.bg, color: voteInfo.color, fontWeight: 700 }, children: voteInfo.label })
          ] }, v._id);
        }) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }, children: "This member has not cast any movie votes yet." }) }),
        userModalTab === "discussions" && /* @__PURE__ */ jsx("div", { children: ((_t = userDetail.discussions) == null ? void 0 : _t.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }, children: userDetail.discussions.map((d) => /* @__PURE__ */ jsxs("div", { style: { padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", color: "#f8fafc" }, children: d.title }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }, children: d.content }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "#64748b", marginTop: 6 }, children: [
            formatDate(d.createdAt),
            " • ",
            d.commentCount || 0,
            " comments"
          ] })
        ] }, d._id)) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }, children: "This member has not created any discussions yet." }) }),
        userModalTab === "comments" && /* @__PURE__ */ jsx("div", { children: ((_u = userDetail.comments) == null ? void 0 : _u.length) > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }, children: userDetail.comments.map((c) => /* @__PURE__ */ jsxs("div", { style: { padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.84rem", color: "#cbd5e1" }, children: c.content }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "#64748b", marginTop: 4 }, children: formatDate(c.createdAt) })
        ] }, c._id)) }) : /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "0.85rem" }, children: "This member has not posted any comments yet." }) })
      ] })
    ] }) }),
    confirmModal && /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: () => setConfirmModal(null), children: /* @__PURE__ */ jsxs("div", { className: "modal", style: { maxWidth: 450, background: "var(--bg2, #181a20)", borderRadius: 12, padding: 24 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.05rem", fontWeight: 700, marginBottom: 12, color: "#f8fafc" }, children: "Confirmation" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: 20 }, children: confirmModal.message }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost", onClick: () => setConfirmModal(null), children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold", onClick: confirmModal.onConfirm, children: "Confirm" })
      ] })
    ] }) })
  ] });
}
export {
  CommunityPanel as default
};
