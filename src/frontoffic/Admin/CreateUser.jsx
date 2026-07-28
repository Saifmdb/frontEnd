import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../frontcss/CreateUser.css";
import { msalLogout, clearMsalCache } from "../../msalInstance";
import NavAdmin from "../components/navadmin";

const DEFAULT_AVATAR = "/images/images55.jpg";

const DEPARTMENT_OPTIONS = [
  { value: "RH", label: "RH" },
  { value: "DIGITAL", label: "Digital" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MANAGEMENT", label: "Management" },
];

export default function CreateUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [managers, setManagers] = useState([]);
  const [rhs, setRhs] = useState([]);
  const [form, setForm] = useState({
    role: "EMPLOYEE",
    username: "",
    email: "",
    civility: "",
    first_name: "",
    last_name: "",
    gendre: "",
    cin: "",
    phone: "",
    address: "",
    depatement: "DIGITAL",
    fonction: "",
    date_entree: "",
    date_titularisation: "",
    solde_conge: 30,
    salaire: "",
    manager_id: "",
    rh_id: "",
  });

  const isAdminRole = form.role === "ADMIN";

  const filteredManagers = useMemo(
    () => managers.filter((manager) => !form.depatement || manager.department === form.depatement),
    [managers, form.depatement]
  );

  const filteredRhs = useMemo(
    () => rhs.filter((rhUser) => (form.depatement === "RH" ? rhUser.role !== "EMPLOYEE" : true)),
    [rhs, form.depatement]
  );

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
    const tempToken = localStorage.getItem("temp_token");
    const hasJwtFormat = token && token.split(".").length === 3;
    return hasJwtFormat
      ? { Authorization: `Bearer ${token}` }
      : tempToken
        ? { Authorization: `Bearer ${tempToken}` }
        : {};
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

  useEffect(() => {
    const loadReferences = async () => {
      setLoadingRefs(true);
      setError("");
      try {
        const headers = getAuthHeaders();
        const [managersResponse, rhResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/managers/`, {
            headers,
            credentials: "include",
          }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/rh/`, {
            headers,
            credentials: "include",
          }),
        ]);

        const managersData = await managersResponse.json();
        const rhData = await rhResponse.json();

        if (managersResponse.ok && managersData.success) {
          setManagers(managersData.managers || []);
        }

        if (rhResponse.ok && rhData.success) {
          setRhs(rhData.rhs || []);
        }
      } catch (loadError) {
        setError(loadError.message || "Impossible de charger les references");
      } finally {
        setLoadingRefs(false);
      }
    };

    loadReferences();
  }, []);

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
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
      return { ...prev, [name]: value };
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        role: form.role,
        username: form.username.trim(),
        email: form.email.trim(),
        company_email: form.email.trim(),
        civility: form.civility || null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gendre: form.gendre || null,
        cin: form.cin.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        depatement: form.depatement || null,
        fonction: form.fonction.trim(),
        date_entree: form.date_entree || null,
        date_titularisation: form.date_titularisation || null,
        solde_conge: Number(form.solde_conge || 30),
        salaire: form.salaire || null,
        manager_id: isAdminRole ? null : (form.manager_id || null),
        rh_id: isAdminRole ? null : (form.rh_id || null),
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Echec de creation utilisateur");
      }

      setSuccess("Utilisateur cree avec succes.");
      setTimeout(() => {
        navigate("/user-manager");
      }, 900);
    } catch (submitError) {
      setError(submitError.message || "Echec de creation utilisateur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-user-page">
      <NavAdmin profileInfo={profileInfo} onLogout={handleLogout} active="users" />

      <main className="create-user-main">
        <header className="create-user-topbar">
          <h2>User Management</h2>
          <div className="create-user-search-wrap">
            <span className="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search resources..." disabled />
          </div>
        </header>

        <div className="create-user-content">
          <nav className="create-user-breadcrumb" aria-label="Fil d'ariane">
            <Link to="/dashboard">Accueil</Link>
            <span className="material-symbols-outlined">chevron_right</span>
            <Link to="/user-manager">User Manager</Link>
            <span className="material-symbols-outlined">chevron_right</span>
            <strong>Creer un utilisateur</strong>
          </nav>

          <div className="create-user-title-block">
            <h1>Creation de Compte</h1>
            <p>
              Veuillez renseigner l&apos;ensemble des informations academiques et professionnelles pour
              integrer le nouvel utilisateur au reseau Honoris.
            </p>
          </div>

          {error && <p className="create-user-feedback error">{error}</p>}
          {success && <p className="create-user-feedback success">{success}</p>}

          <form className="create-user-form" onSubmit={onSubmit}>
            <section>
              <div className="create-user-section-head red">
                <div className="line"></div>
                <h3>Information de Connexion</h3>
              </div>
              <div className="create-user-connection-grid">
                <label className="create-user-card-field">
                  <span>Role Systeme</span>
                  <select name="role" value={form.role} onChange={onFieldChange} required>
                    <option value="ADMIN">Admin</option>
                    <option value="ORGANIZER">Organisateur</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </label>

                <label className="create-user-card-field">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={onFieldChange}
                    placeholder="e.g. j.smith"
                    required
                  />
                </label>

                <label className="create-user-card-field">
                  <span>Email Academique</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onFieldChange}
                    placeholder="email@honoris.net"
                    required
                  />
                </label>
              </div>
            </section>

            <section>
              <div className="create-user-section-head green">
                <div className="line"></div>
                <h3>Information Personnelle</h3>
              </div>
              <div className="create-user-panel">
                <div className="create-user-grid three">
                  <fieldset className="create-user-fieldset">
                    <legend>Civilite</legend>
                    <label>
                      <input
                        type="radio"
                        name="civility"
                        value="Mr"
                        checked={form.civility === "Mr"}
                        onChange={onFieldChange}
                      />
                      Mr
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="civility"
                        value="Ms"
                        checked={form.civility === "Ms"}
                        onChange={onFieldChange}
                      />
                      Ms
                    </label>
                  </fieldset>

                  <label className="ghost-field">
                    <span>Prenom</span>
                    <input type="text" name="first_name" value={form.first_name} onChange={onFieldChange} />
                  </label>

                  <label className="ghost-field">
                    <span>Nom</span>
                    <input type="text" name="last_name" value={form.last_name} onChange={onFieldChange} />
                  </label>

                  <label className="ghost-field">
                    <span>Genre</span>
                    <select name="gendre" value={form.gendre} onChange={onFieldChange}>
                      <option value="">Selectionner</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </label>

                  <label className="ghost-field">
                    <span>CIN / Passeport</span>
                    <input type="text" name="cin" value={form.cin} onChange={onFieldChange} />
                  </label>

                  <label className="ghost-field">
                    <span>Telephone</span>
                    <input type="tel" name="phone" value={form.phone} onChange={onFieldChange} placeholder="+212 ..." />
                  </label>

                  <label className="ghost-field full-width">
                    <span>Adresse Residentielle</span>
                    <input type="text" name="address" value={form.address} onChange={onFieldChange} />
                  </label>
                </div>
              </div>
            </section>

            <section className="create-user-prof-grid">
              <div>
                <div className="create-user-section-head amber">
                  <div className="line"></div>
                  <h3>Professionnel</h3>
                </div>
                <div className="create-user-badge-card">
                  <img src={DEFAULT_AVATAR} alt="Office workspace" />
                  <div className="badge-overlay">
                    <p>Badge ID</p>
                    <strong>ID-AUTO</strong>
                  </div>
                </div>
              </div>

              <div className="create-user-panel">
                <div className="create-user-grid two">
                  <label className="ghost-field">
                    <span>Matricule</span>
                    <input type="text" value="Genere automatiquement" readOnly />
                  </label>

                  <label className="ghost-field">
                    <span>Departement</span>
                    <select name="depatement" value={form.depatement} onChange={onFieldChange}>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <option key={department.value} value={department.value}>
                          {department.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ghost-field full-width">
                    <span>Fonction</span>
                    <input
                      type="text"
                      name="fonction"
                      value={form.fonction}
                      onChange={onFieldChange}
                      placeholder="Poste occupe..."
                    />
                  </label>

                  <label className="ghost-field">
                    <span>Date d&apos;entree</span>
                    <input type="date" name="date_entree" value={form.date_entree} onChange={onFieldChange} />
                  </label>

                  <label className="ghost-field">
                    <span>Date de titularisation</span>
                    <input
                      type="date"
                      name="date_titularisation"
                      value={form.date_titularisation}
                      onChange={onFieldChange}
                    />
                  </label>

                  <label className="ghost-field">
                    <span>Solde conges (Jours)</span>
                    <input
                      type="number"
                      min="0"
                      name="solde_conge"
                      value={form.solde_conge}
                      onChange={onFieldChange}
                    />
                  </label>
                  <label className="ghost-field">
                    <span>Salaire (DT)</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="salaire"
                      value={form.salaire}
                      onChange={onFieldChange}
                      placeholder="0.000"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section>
              <div className="create-user-section-head red-lite">
                <div className="line"></div>
                <h3>Hierarchie</h3>
              </div>
              <div className="create-user-grid two hierarchy-panel">
                <label className="hierarchy-card">
                  <span className="title">Manager responsable</span>
                  <select
                    name="manager_id"
                    value={form.manager_id}
                    onChange={onFieldChange}
                    disabled={loadingRefs || isAdminRole}
                  >
                    <option value="">Selectionner un Organisateur</option>
                    {filteredManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name}{manager.department ? ` (${manager.department})` : ""}
                      </option>
                    ))}
                  </select>
                  <small>Limite aux roles ORGANIZER</small>
                </label>

                <label className="hierarchy-card">
                  <span className="title">RH responsable</span>
                  <select
                    name="rh_id"
                    value={form.rh_id}
                    onChange={onFieldChange}
                    disabled={loadingRefs || isAdminRole}
                  >
                    <option value="">Selectionner un Responsable RH</option>
                    {filteredRhs.map((rh) => (
                      <option key={rh.id} value={rh.id}>
                        {rh.full_name}
                        {rh.role_label ? ` (${rh.role_label})` : ""}
                        {rh.department ? ` - ${rh.department}` : ""}
                      </option>
                    ))}
                  </select>
                  <small>Utilisateurs du departement RH uniquement</small>
                </label>
              </div>
            </section>

            <div className="create-user-actions">
              <button type="button" className="cancel-btn" onClick={() => navigate("/user-manager")}>Annuler</button>
              <button type="submit" className="submit-btn" disabled={loading}>
                <span className="material-symbols-outlined">person_add</span>
                {loading ? "Creation..." : "Creer le compte"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}