import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../frontcss/UserDetail.css";
import { msalLogout, clearMsalCache } from "../../msalInstance";
import NavAdmin from "../components/navadmin";

const DEFAULT_AVATAR = "/images/default-user-icon.svg";

export default function UserDetail() {
  const { userId } = useParams();
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [managers, setManagers] = useState([]);
  const [rhs, setRhs] = useState([]);
  const [formData, setFormData] = useState({
    role: "",
    fonction: "",
    depatement: "",
    date_entree: "",
    solde_conge: "",
    salaire: "",
    termination_date: "",
    company_email: "",
    manager_id: "",
    rh_id: "",
  });

  const isAdminRole = formData.role === "ADMIN";

  const filteredManagers = useMemo(() => {
    return managers.filter((manager) => {
      if (String(manager.id) === String(userId)) return false;
      if (!formData.depatement) return true;
      return manager.department === formData.depatement;
    });
  }, [managers, formData.depatement, userId]);

  const filteredRhs = useMemo(() => {
    return rhs.filter((rhUser) => {
      if (String(rhUser.id) === String(userId)) return false;
      if (formData.depatement === "RH") return rhUser.role !== "EMPLOYEE";
      return true;
    });
  }, [rhs, formData.depatement, userId]);

  const departmentOptions = [
    { value: "RH", label: "RH" },
    { value: "DIGITAL", label: "Digital" },
    { value: "MARKETING", label: "Marketing" },
    { value: "MANAGEMENT", label: "Management" },
  ];

  const roleOptions = [
    { value: "ADMIN", label: "Admin" },
    { value: "ORGANIZER", label: "Manager" },
    { value: "EMPLOYEE", label: "Employe" },
  ];

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
    } catch (error) {
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("microsoft_auth");
      clearMsalCache();
      window.location.href = "/signin";
    }
  };

  useEffect(() => {
    const fetchUserDetail = async () => {
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

        const [detailResponse, managersResponse, rhResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/`, {
            headers,
            credentials: "include",
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/managers/`, {
            headers,
            credentials: "include",
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/rh/`, {
            headers,
            credentials: "include",
          }),
        ]);

        const detailData = await detailResponse.json();
        const managersData = await managersResponse.json();
        const rhData = await rhResponse.json();

        if (!detailResponse.ok || !detailData.success) {
          throw new Error(detailData.error || "Failed to load user details");
        }

        if (managersResponse.ok && managersData.success) {
          setManagers(managersData.managers || []);
        }

        if (rhResponse.ok && rhData.success) {
          setRhs(rhData.rhs || []);
        }

        setUserDetail(detailData.user);
        const profile = detailData.user?.profile || {};
        setFormData({
          role: detailData.user?.role || "",
          fonction: profile.fonction || "",
          depatement: profile.depatement || "",
          date_entree: profile.date_entree || "",
          solde_conge: profile.solde_conge ? String(profile.solde_conge) : "",
          salaire: profile.salaire || "",
          termination_date: profile.termination_date || "",
          company_email: profile.company_email || "",
          manager_id: profile.manager?.id ? String(profile.manager.id) : "",
          rh_id: profile.rh_responsable?.id ? String(profile.rh_responsable.id) : "",
        });
      } catch (err) {
        setError(err.message || "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [userId]);

  const fullName = userDetail?.full_name || userDetail?.username || "Utilisateur";
  const profile = userDetail?.profile || {};
  const statusLabel = userDetail?.is_active ? "Actif" : "Inactif";
  const statusClass = userDetail?.is_active ? "active" : "inactive";
  const formattedDate = profile.date_entree
    ? new Date(profile.date_entree).toLocaleDateString("fr-FR")
    : "-";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      if (name === "role") {
        return {
          ...prev,
          role: value,
          manager_id: value === "ADMIN" ? "" : prev.manager_id,
          rh_id: value === "ADMIN" ? "" : prev.rh_id,
        };
      }
      if (name === "depatement") {
        const stillValidManager = managers.some(
          (manager) => String(manager.id) === String(prev.manager_id) && manager.department === value
        );
        const stillValidRh = rhs.some((rhUser) => {
          if (String(rhUser.id) !== String(prev.rh_id)) return false;
          return value === "RH" ? rhUser.role !== "EMPLOYEE" : true;
        });
        return {
          ...prev,
          depatement: value,
          manager_id: stillValidManager ? prev.manager_id : "",
          rh_id: stillValidRh ? prev.rh_id : "",
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSave = async () => {
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
        body: JSON.stringify({
          role: formData.role,
          fonction: formData.fonction,
          depatement: formData.depatement,
          date_entree: formData.date_entree,
          solde_conge: formData.solde_conge ? Number(formData.solde_conge) : null,
          salaire: formData.salaire || null,
          termination_date: formData.termination_date,
          company_email: formData.company_email,
          manager_id: isAdminRole ? "" : formData.manager_id,
          rh_id: isAdminRole ? "" : formData.rh_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Update failed");
      }

      setUserDetail(data.user);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  return (
    <div className="detail-page">
      <NavAdmin profileInfo={profileInfo} onLogout={handleLogout} active="users" />

      <main className="detail-main">
        <header className="detail-header">
          <div>
            <p className="detail-kicker">User Manager / Detail</p>
            <h2>Details de l'employe</h2>
          </div>
        </header>

        {loading && <p className="detail-loading">Chargement...</p>}
        {error && <p className="detail-error">{error}</p>}

        {!loading && !error && userDetail && (
          <div className="detail-grid">
            <section className="detail-left">
              <div className="detail-card detail-profile">
                <div className="detail-avatar-wrap">
                  <img
                    src={DEFAULT_AVATAR}
                    alt={fullName}
                    onError={(event) => {
                      if (event.currentTarget.src.includes("default-user-icon.svg")) return;
                      event.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                  <span className="detail-verified">
                    <span className="material-symbols-outlined">verified</span>
                  </span>
                </div>
                <h3>{fullName}</h3>
                <p>{profile.fonction || "Collaborateur"}</p>
                <div className="detail-pill-row">
                  <div>
                    <span>Statut</span>
                    <strong className={statusClass}>{statusLabel}</strong>
                  </div>
                  <div>
                    <span>Matricule</span>
                    <strong>{profile.matricule || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-card detail-contact">
                <div>
                  <div className="detail-icon">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <small>E-mail institutionnel</small>
                    <strong>{profile.company_email || userDetail.email || "-"}</strong>
                  </div>
                </div>
                <div>
                  <div className="detail-icon">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <small>Telephone</small>
                    <strong>{profile.phone || "-"}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-right">
              <div className="detail-card detail-section">
                <div className="detail-section-title">
                  <span className="material-symbols-outlined">person</span>
                  <h4>Informations Personnelles</h4>
                </div>
                <div className="detail-section-grid">
                  <div>
                    <span>Nom et Prenom</span>
                    <strong>{fullName}</strong>
                  </div>
                  <div>
                    <span>CIN / Passport</span>
                    <strong>{profile.cin || "-"}</strong>
                  </div>
                  <div className="full">
                    <span>Adresse de Residence</span>
                    <strong>{profile.address || "-"}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{userDetail.email || "-"}</strong>
                  </div>
                  <div>
                    <span>Telephone</span>
                    <strong>{profile.phone || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-card detail-section highlight">
                <div className="detail-section-title">
                  <span className="material-symbols-outlined">school</span>
                  <h4>Informations Professionnelles</h4>
                  <button
                    className={`detail-edit-toggle${isEditing ? " is-active" : ""}`}
                    type="button"
                    onClick={() => setIsEditing((prev) => !prev)}
                    aria-label="Activer la modification"
                  >
                    <span className="detail-toggle-knob" aria-hidden="true"></span>
                  </button>
                </div>
                <div className="detail-section-grid">
                  <label className="detail-input">
                    <span>Role</span>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={!isEditing}
                    >
                      <option value="">-</option>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="detail-input">
                    <span>Grade</span>
                    <input
                      name="fonction"
                      type="text"
                      value={formData.fonction}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="-"
                    />
                  </label>
                  <label className="detail-input">
                    <span>Departement</span>
                    <select
                      name="depatement"
                      value={formData.depatement}
                      onChange={handleChange}
                      disabled={!isEditing}
                    >
                      <option value="">-</option>
                      {departmentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="detail-input">
                    <span>Date d'entree</span>
                    <input
                      name="date_entree"
                      type="date"
                      value={formData.date_entree}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </label>
                  <label className="detail-input">
                    <span>Solde de conges</span>
                    <input
                      name="solde_conge"
                      type="number"
                      value={formData.solde_conge}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="30"
                    />
                  </label>
                  <label className="detail-input">
                    <span>Manager</span>
                    <select
                      name="manager_id"
                      value={formData.manager_id}
                      onChange={handleChange}
                      disabled={!isEditing || isAdminRole}
                    >
                      <option value="">-</option>
                      {filteredManagers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name}{manager.department ? ` (${manager.department})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="detail-input">
                    <span>RH responsable</span>
                    <select
                      name="rh_id"
                      value={formData.rh_id}
                      onChange={handleChange}
                      disabled={!isEditing || isAdminRole}
                    >
                      <option value="">-</option>
                      {filteredRhs.map((rhUser) => (
                        <option key={rhUser.id} value={rhUser.id}>
                          {rhUser.full_name}
                          {rhUser.role_label ? ` (${rhUser.role_label})` : ""}
                          {rhUser.department ? ` - ${rhUser.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="detail-input">
                    <span>Salaire (DT)</span>
                    <input
                      name="salaire"
                      type="number"
                      step="0.001"
                      value={formData.salaire}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="0.000"
                    />
                  </label>
                  <label className="detail-input">
                    <span>Date de fin</span>
                    <input
                      name="termination_date"
                      type="date"
                      value={formData.termination_date}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </label>
                  <label className="detail-input">
                    <span>Email company</span>
                    <input
                      name="company_email"
                      type="email"
                      value={formData.company_email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="-"
                    />
                  </label>
                </div>
                <div className="detail-actions">
                  <button
                    className="detail-save"
                    type="button"
                    disabled={!isEditing}
                    onClick={handleSave}
                  >
                    Enregistrer
                  </button>
                </div>
                <div className="detail-note">
                  <span className="material-symbols-outlined">info</span>
                  <p>Les modifications de cette section doivent etre approuvees par le departement RH.</p>
                </div>
              </div>
            </section>
          </div>
        )}

 
      </main>
    </div>
  );
}
