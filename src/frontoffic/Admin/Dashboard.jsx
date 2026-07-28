import { useEffect, useMemo, useState } from "react";
import "../frontcss/Dashboard.css";
import { msalLogout, clearMsalCache } from "../../msalInstance";
import NavAdmin from "../components/navadmin";

export default function Dashboard() {
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const profileInfo = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) {
        return { name: "Utilisateur", role: "HR Director" };
      }
      const user = JSON.parse(rawUser);
      const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      return {
        name: fullName || user?.username || "Utilisateur",
        role: user?.role || "HR Director",
      };
    } catch {
      return { name: "Utilisateur", role: "HR Director" };
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
        const [name] = cookie.trim().split("=");
        if (name.includes("sessionid") || name.includes("csrftoken")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });

      window.location.href = "/signin?logout=true&t=" + Date.now();
    } catch (error) {
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("microsoft_auth");
      clearMsalCache();
      window.location.href = "/signin";
    }
  };

  const fetchLoginHistory = async () => {
    setHistoryError("");
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
      const tempToken = localStorage.getItem("temp_token");
      const hasJwtFormat = token && token.split(".").length === 3;
      const headers = hasJwtFormat
        ? { Authorization: `Bearer ${token}` }
        : tempToken
          ? { Authorization: `Bearer ${tempToken}` }
          : {};

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login-history/?limit=10`, {
        headers,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load login history");
      }

      setLoginHistory(data.history || []);
    } catch (err) {
      setHistoryError(err.message || "Failed to load login history");
    }
  };

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  return (
    <div className="hr-dashboard">
      <NavAdmin profileInfo={profileInfo} onLogout={handleLogout} active="dashboard" />

      <main className="hr-main">
        <header className="hr-topbar">
          <h2>HR Statistics Dashboard</h2>
          <div className="hr-top-actions">
            <div className="hr-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Quick search..." />
            </div>
            <button className="hr-icon-btn" type="button" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="hr-notify-dot"></span>
            </button>
            <button className="hr-icon-btn" type="button" aria-label="Settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <img
              className="hr-avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIQY6Xhr7nUfoln5s0iyxsGoIi7qHewAt3Awlrtanq5h-YyyPM0dACpKfH7aGRrO-IMuzEQLNf5xToQWuEzPI5DBu9XQvZVNbyuowUOhYP5sOLZ7yJTdTpArcCRpjeiBk5jJDHmBANXHpvAPmQHd8JMOz_spJOVBMe_ewCs6WYkO-wePB_zum9M4Ud0ruyOMHDlNPEBdzt4rokmWBr9rJZrIDdYAOAUNs1b1HSCv1efqtsqb-JTEzTKd6BOamrpwMzBuyj-OhSHwI"
              alt="Admin Avatar"
            />
          </div>
        </header>

        <div className="hr-content">
          <section>
            <div className="hr-section-header">
              <div>
                <p className="hr-section-kicker">Overview</p>
                <h3>HR Snapshot</h3>
              </div>
              <a className="hr-link-btn" href="#">
                Download Report
                <span className="material-symbols-outlined">download</span>
              </a>
            </div>

            <div className="hr-kpi-grid">
              <div className="hr-kpi-card">
                <div className="hr-kpi-top">
                  <div
                    className="hr-kpi-icon"
                    style={{ background: "rgba(126, 0, 8, 0.08)", color: "var(--hr-primary)" }}
                  >
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <span className="hr-pill" style={{ background: "rgba(63, 102, 83, 0.1)", color: "var(--hr-secondary)" }}>
                    +2.4%
                  </span>
                </div>
                <p>Total Employees</p>
                <h4>8,642</h4>
                <div className="hr-progress">
                  <span style={{ width: "75%", background: "var(--hr-primary)" }}></span>
                </div>
              </div>

              <div className="hr-kpi-card">
                <div className="hr-kpi-top">
                  <div
                    className="hr-kpi-icon"
                    style={{ background: "rgba(63, 102, 83, 0.08)", color: "var(--hr-secondary)" }}
                  >
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                  </div>
                  <span className="hr-pill" style={{ background: "rgba(186, 26, 26, 0.1)", color: "#ba1a1a" }}>
                    -0.8%
                  </span>
                </div>
                <p>Staff Admin</p>
                <h4>1,820</h4>
                <div className="hr-progress">
                  <span style={{ width: "21%", background: "var(--hr-secondary)" }}></span>
                </div>
              </div>

              <div className="hr-kpi-card">
                <div className="hr-kpi-top">
                  <div
                    className="hr-kpi-icon"
                    style={{ background: "rgba(115, 92, 0, 0.08)", color: "var(--hr-tertiary)" }}
                  >
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <span className="hr-pill" style={{ background: "rgba(63, 102, 83, 0.1)", color: "var(--hr-secondary)" }}>
                    +12.1%
                  </span>
                </div>
                <p>Monthly Payroll</p>
                <h4>$4.2M</h4>
                <div className="hr-progress">
                  <span style={{ width: "64%", background: "var(--hr-tertiary)" }}></span>
                </div>
              </div>
            </div>
          </section>

          <div className="hr-bento">
            <section className="hr-card hr-chart" style={{ gridColumn: "span 2" }}>
              <div className="hr-section-header" style={{ marginBottom: "12px" }}>
                <div>
                  <h3>Workforce Growth</h3>
                  <p style={{ color: "#8a9197", fontSize: "13px" }}>Monthly hiring vs. turnover trends</p>
                </div>
                <div className="hr-toggle">
                  <button className="is-active" type="button">6 Months</button>
                  <button type="button">1 Year</button>
                </div>
              </div>
              <div className="hr-chart-bars">
                <div className="hr-bar" style={{ height: "40%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 0.2)" }}></div>
                  <span>JAN</span>
                </div>
                <div className="hr-bar" style={{ height: "55%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 0.4)" }}></div>
                  <span>FEB</span>
                </div>
                <div className="hr-bar" style={{ height: "45%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 0.3)" }}></div>
                  <span>MAR</span>
                </div>
                <div className="hr-bar" style={{ height: "70%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 0.6)" }}></div>
                  <span>APR</span>
                </div>
                <div className="hr-bar" style={{ height: "85%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 1)" }}></div>
                  <span>MAY</span>
                </div>
                <div className="hr-bar" style={{ height: "60%" }}>
                  <div className="hr-bar-fill" style={{ height: "100%", background: "rgba(126, 0, 8, 0.5)" }}></div>
                  <span>JUN</span>
                </div>
              </div>
            </section>

            <section className="hr-card hr-side-card">
              <div>
                <h3>Departmental Mix</h3>
                <p>Resource allocation by core academic departments</p>
              </div>
              <div>
                <div style={{ marginBottom: "18px" }}>
                  <div className="hr-mix-row">
                    <span>Engineering & Tech</span>
                    <span>38%</span>
                  </div>
                  <div className="hr-mix-track">
                    <span style={{ width: "38%", background: "var(--hr-tertiary)" }}></span>
                  </div>
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <div className="hr-mix-row">
                    <span>Business School</span>
                    <span>24%</span>
                  </div>
                  <div className="hr-mix-track">
                    <span style={{ width: "24%", background: "#ffffff" }}></span>
                  </div>
                </div>
                <div>
                  <div className="hr-mix-row">
                    <span>Health Sciences</span>
                    <span>22%</span>
                  </div>
                  <div className="hr-mix-track">
                    <span style={{ width: "22%", background: "rgba(255, 255, 255, 0.7)" }}></span>
                  </div>
                </div>
              </div>
              <button className="hr-outline-btn" type="button">
                View Detailed Audit
              </button>
            </section>
          </div>

          <section className="hr-table-card">
            <div className="hr-table-head">
              <h3>Login History</h3>
              <button className="hr-icon-btn" type="button" aria-label="Filter">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Action Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyError && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "16px" }}>
                        {historyError}
                      </td>
                    </tr>
                  )}
                  {!historyError && loginHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "16px" }}>
                        No login history found.
                      </td>
                    </tr>
                  )}
                  {!historyError &&
                    loginHistory.map((item) => {
                      const loginDate = item.login_at
                        ? new Date(item.login_at).toLocaleString("fr-FR")
                        : "-";
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="hr-employee">
                              <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzpmnIUYTS1LqeDpXhvr07EJuY7cTGalASeGlSfCY8Sp5yg7U4V23GU-OcYg8bEPhmdoixVQ9Zv99M6X4HFnGCGGs4peYtPqMVYX_psUy2elZGjIFuZ_BFJmMv7ZrADTTutgHeV4C8j2iFG0oujmAEqP-y54A4QUJknF7pA7wiqOd-pod0wi9hq1_OiiDldHjlo699RP9PK-VdqBJZzEYdZjC8KJfEaoD_kpOIGG_mIfCbc8zB2lOvkiSGLWhcfv25H18WKTmX7M0"
                                alt="Employee"
                              />
                              <div>
                                <strong>{item.user?.full_name || "Utilisateur"}</strong>
                                <small>{item.user?.email || "-"}</small>
                              </div>
                            </div>
                          </td>
                          <td>{item.user?.department || "-"}</td>
                          <td>
                            <span className="hr-tag" style={{ background: "rgba(126, 0, 8, 0.08)", color: "var(--hr-primary)" }}>
                              Login
                            </span>
                          </td>
                          <td>{loginDate}</td>
                          <td>
                            <span className="hr-status">
                              <span className="hr-status-dot" style={{ background: "var(--hr-secondary)" }}></span>
                              Completed
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="hr-icon-btn" type="button" aria-label="More">
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="hr-table-footer">
              <span>Showing {loginHistory.length} activities</span>
            </div>
          </section>
        </div>
      </main>

    </div>
  );
}
