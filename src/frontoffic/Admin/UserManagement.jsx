import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../frontcss/UserManagement.css";
import { msalLogout, clearMsalCache } from "../../msalInstance";
import NavAdmin from "../components/navadmin";
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState("down");
  const [menuPosition, setMenuPosition] = useState(null);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const navigate = useNavigate();

  const profileInfo = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) {
        return { name: "Admin User", role: "Super Admin" };
      }
      const user = JSON.parse(rawUser);
      const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      return {
        name: fullName || user?.username || "Admin User",
        role: user?.role || "Super Admin",
      };
    } catch {
      return { name: "Admin User", role: "Super Admin" };
    }
  }, []);

  const getCsrfToken = () => {
    const name = "csrftoken";
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === `${name}=`) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleLogout = async () => {
    try {
      try {
        await msalLogout();
      } catch (msalError) {
        console.warn("MSAL logout error:", msalError);
      }

      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
          },
          credentials: "include",
        });
      } catch (apiError) {
        console.warn("Logout API error:", apiError);
      }

      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("microsoft_auth");
      clearMsalCache();

      document.cookie.split(";").forEach((cookie) => {
        const [cookieName] = cookie.trim().split("=");
        if (cookieName.includes("sessionid") || cookieName.includes("csrftoken")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });

      window.location.href = "/signin?logout=true&t=" + Date.now();
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("microsoft_auth");
      clearMsalCache();
      window.location.href = "/signin";
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
      const tempToken = localStorage.getItem("temp_token");
      const hasJwtFormat = token && token.split(".").length === 3;
      const headers = hasJwtFormat
        ? { Authorization: `Bearer ${token}` }
        : tempToken
          ? { Authorization: `Bearer ${tempToken}` }
          : {};

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/`, {
        headers,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeMenuId === null) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (event.target.closest(".admin-actions-menu") || event.target.closest(".admin-actions")) {
        return;
      }
      setActiveMenuId(null);
      setMenuPosition(null);
    };

    const handleViewportChange = () => {
      setActiveMenuId(null);
      setMenuPosition(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeMenuId]);

  const getRoleClass = (role) => {
    switch (role) {
      case "ADMIN":
        return "amber";
      case "RH":
        return "blue";
      case "ORGANIZER":
        return "green";
      default:
        return "gray";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "RH":
        return "HR";
      case "ORGANIZER":
        return "Manager";
      default:
        return "Staff";
    }
  };

  const getInitials = (user) => {
    const source = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "U";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
    return initials || "U";
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Supprimer ce compte ?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
      const tempToken = localStorage.getItem("temp_token");
      const hasJwtFormat = token && token.split(".").length === 3;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
          ...(hasJwtFormat
            ? { Authorization: `Bearer ${token}` }
            : tempToken
              ? { Authorization: `Bearer ${tempToken}` }
              : {}),
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setActiveMenuId(null);
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const handleToggleActive = async (userId, nextActive) => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
      const tempToken = localStorage.getItem("temp_token");
      const hasJwtFormat = token && token.split(".").length === 3;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(hasJwtFormat
            ? { Authorization: `Bearer ${token}` }
            : tempToken
              ? { Authorization: `Bearer ${tempToken}` }
              : {}),
        },
        credentials: "include",
        body: JSON.stringify({ is_active: nextActive }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Update failed");
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? data.user : user)));
      setActiveMenuId(null);
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  const departmentOptions = useMemo(() => {
    const uniqueDepartments = new Set();
    users.forEach((user) => {
      if (user.profile?.depatement) {
        uniqueDepartments.add(user.profile.depatement);
      }
    });
    return Array.from(uniqueDepartments).sort();
  }, [users]);

  const filteredUsers = users.filter((user) => {
    const searchValue = query.toLowerCase();
    const matchesQuery =
      !query ||
      user.full_name?.toLowerCase().includes(searchValue) ||
      user.email?.toLowerCase().includes(searchValue) ||
      user.username?.toLowerCase().includes(searchValue);

    const matchesDepartment =
      departmentFilter === "all" || user.profile?.depatement === departmentFilter;

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesQuery && matchesDepartment && matchesRole;
  });

  return (
    <div className="admin-users">
      <NavAdmin profileInfo={profileInfo} onLogout={handleLogout} active="users" />

      <main className="admin-users-main">
        <header className="admin-users-header">
          <div>
            <h2>Gestion des Utilisateurs</h2>
            <p>
              Supervisez les acces et les roles des collaborateurs a travers le reseau Honoris
              United Universities.
            </p>
          </div>
          <button
            className="admin-primary-btn"
            type="button"
            onClick={() => navigate("/user-manager/create")}
          >
            <span className="material-symbols-outlined">person_add</span>
            Nouvel Utilisateur
          </button>
        </header>

        <section className="admin-users-filters">
          <label className="admin-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="all">Tous les Departements</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">Tous les Roles</option>
            <option value="EMPLOYEE">Staff (Employee)</option>
            <option value="ORGANIZER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </section>

        <section className="admin-users-table">
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Role</th>
                  <th>Departement</th>
                  <th>Statut</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      Chargement des utilisateurs...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={5} className="admin-empty error">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      Aucun utilisateur trouve.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  filteredUsers.map((user) => {
                    const roleClass = getRoleClass(user.role);
                    const roleLabel = getRoleLabel(user.role);
                    const departmentName = user.profile?.depatement || "-";
                    const functionName = user.profile?.fonction || "";
                    const email = user.profile?.company_email || user.email || "-";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-user">
                            <div className="admin-avatar">{getInitials(user)}</div>
                            <div>
                              <strong>{user.full_name || user.username}</strong>
                              <span>{email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-pill ${roleClass}`}>{roleLabel}</span>
                        </td>
                        <td>
                          <div className="admin-meta">
                            <strong>{departmentName}</strong>
                            <span>{functionName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-status ${user.is_active ? "active" : "inactive"}`}>
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="table-actions">
                          <div className="admin-actions">
                            <button
                              className="admin-icon-btn"
                              type="button"
                              onClick={(event) => {
                                if (activeMenuId === user.id) {
                                  setActiveMenuId(null);
                                  setMenuPosition(null);
                                  return;
                                }
                                const rect = event.currentTarget.getBoundingClientRect();
                                const menuHeight = 156;
                                const menuWidth = 190;
                                const gap = 8;
                                const margin = 12;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const spaceAbove = rect.top;
                                const direction =
                                  spaceBelow < menuHeight && spaceAbove > spaceBelow ? "up" : "down";
                                const rawTop =
                                  direction === "up"
                                    ? rect.top - menuHeight - gap
                                    : rect.bottom + gap;
                                const rawLeft = rect.right - menuWidth;
                                const clampedTop = Math.min(
                                  window.innerHeight - menuHeight - margin,
                                  Math.max(margin, rawTop)
                                );
                                const clampedLeft = Math.min(
                                  window.innerWidth - menuWidth - margin,
                                  Math.max(margin, rawLeft)
                                );
                                setMenuDirection(direction);
                                setMenuPosition({ top: clampedTop, left: clampedLeft });
                                setActiveMenuId(user.id);
                              }}
                            >
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                            {activeMenuId === user.id &&
                              menuPosition &&
                              createPortal(
                                <div
                                  className={`admin-actions-menu ${
                                    menuDirection === "up" ? "up" : "down"
                                  }`}
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setMenuPosition(null);
                                      navigate(`/user-manager/${user.id}`);
                                    }}
                                  >
                                    Detail
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(user.id, !user.is_active)}
                                  >
                                    {user.is_active ? "Desactiver" : "Activer"}
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    Supprimer
                                  </button>
                                </div>,
                                document.body
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="admin-table-footer">
            <span>Affichage {filteredUsers.length} de {users.length}</span>
          </div>
        </section>

        <section className="admin-users-stats">
          <article>
            <div className="admin-stat-head">
              <div className="admin-stat-icon primary">
                <span className="material-symbols-outlined">school</span>
              </div>
              <span className="admin-badge green">+12% growth</span>
            </div>
            <h4>Total Departements</h4>
            <p>15</p>
          </article>
          <article>
            <div className="admin-stat-head">
              <div className="admin-stat-icon secondary">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <span className="admin-badge green">+4% month</span>
            </div>
            <h4>Total Utilisateurs</h4>
            <p>2,480</p>
          </article>
          <article>
            <div className="admin-stat-head">
              <div className="admin-stat-icon muted">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <span className="admin-badge">Stable</span>
            </div>
            <h4>Actifs ce mois</h4>
            <p>1,942</p>
          </article>
        </section>
      </main>

    </div>
  );
}
