import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/manager.css";

const DEFAULT_ORG_ICON = "/images/default-user-icon.svg";

export default function Manager() {
  const [orgChart, setOrgChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function fetchOrgChart() {
      try {
        const response = await authFetch("/api/session-and-chart/");

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setOrgChart(data.organizational_chart);
            setUserRole(data.organizational_chart.user.role);
            setLoading(false);
            return;
          }
        }

        throw new Error("Authentification échouée. Veuillez vous reconnecter via Microsoft.");

      } catch (err) {
        console.error("❌ Erreur:", err);
        setError(err.message || "Erreur lors du chargement de l'organigramme. Veuillez vous reconnecter.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrgChart();
  }, []);

  const getFullName = (person) => {
    if (!person) return "Utilisateur";
    const fullName = `${person.first_name || ""} ${person.last_name || ""}`.trim();
    return fullName || person.username || "Utilisateur";
  };

  const getRoleLabel = (person, fallback = "Collaborateur") => {
    return person?.profile?.fonction || fallback;
  };

  const getAvatarUrl = (person) => {
    const directAvatar =
      person?.profile?.photo ||
      person?.profile?.avatar ||
      person?.profile_image ||
      person?.avatar;

    return directAvatar || DEFAULT_ORG_ICON;
  };

  const onAvatarError = (event) => {
    if (event.currentTarget.src.includes("default-user-icon.svg")) return;
    event.currentTarget.src = DEFAULT_ORG_ICON;
  };

  const chartModel = useMemo(() => {
    if (!orgChart) return null;

    if (orgChart.type === "manager") {
      const managerChain = orgChart.manager_chain || [];
      const upperManager = managerChain.length ? managerChain[managerChain.length - 1] : null;
      const mainManager = orgChart.user;
      const employees = orgChart.managed_employees || [];

      return {
        upperManager,
        mainManager,
        employees,
      };
    }

    const managerChain = orgChart.manager_chain || [];
    const directManager = managerChain.length
      ? managerChain[managerChain.length - 1]
      : orgChart.manager;
    const upperManager = managerChain.length > 1 ? managerChain[managerChain.length - 2] : null;

    const colleagues = orgChart.colleagues || [];
    const employees = [
      {
        ...orgChart.user,
        isCurrentUser: true,
      },
      ...colleagues.map((item) => ({ ...item, isCurrentUser: false })),
    ];

    return {
      upperManager,
      mainManager: directManager,
      employees,
    };
  }, [orgChart]);

  const renderMiniCard = (person, isCurrentUser = false) => (
    <div key={`${person.id}-mini`} className={`org-mini-card ${isCurrentUser ? "is-current" : ""}`}>
      <img
        className="org-photo org-photo-sm"
        src={getAvatarUrl(person)}
        alt={getFullName(person)}
        loading="lazy"
        onError={onAvatarError}
      />
      <div className="org-mini-content">
        <p className="org-mini-name">
          {getFullName(person)}
          {isCurrentUser && <span className="org-inline-tag"> (Vous)</span>}
        </p>
        <p className="org-mini-role">{getRoleLabel(person, "Employe")}</p>
      </div>
    </div>
  );

  const renderOrgContent = () => {
    if (!chartModel) return <p className="empty-message">Aucune donnée d'organigramme disponible.</p>;

    const hasManager = Boolean(chartModel.mainManager);
    const hasEmployees = chartModel.employees.length > 0;

    return (
      <div className="org-tree-shell">
        {chartModel.upperManager && (
          <>
            <div className="org-top-node">
              <img
                className="org-photo org-photo-lg"
                src={getAvatarUrl(chartModel.upperManager)}
                alt={getFullName(chartModel.upperManager)}
                loading="lazy"
                onError={onAvatarError}
              />
              <div>
                <p className="org-name-lg">{getFullName(chartModel.upperManager)}</p>
                <p className="org-role-lg">{getRoleLabel(chartModel.upperManager, "Manager")}</p>
              </div>
            </div>
            <div className="org-connector-v main"></div>
          </>
        )}

        {hasManager && (
          <div className="org-director-card org-manager-card">
            <img
              className="org-photo org-photo-md"
              src={getAvatarUrl(chartModel.mainManager)}
              alt={getFullName(chartModel.mainManager)}
              loading="lazy"
              onError={onAvatarError}
            />
            <div>
              <p className="org-name-md">
                {getFullName(chartModel.mainManager)}
                <span className="org-inline-tag"> (Manager)</span>
              </p>
              <p className="org-role-md">{getRoleLabel(chartModel.mainManager, "Manager")}</p>
            </div>
          </div>
        )}

        {hasEmployees && (
          <>
            <div className="org-connector-v"></div>
            <div className="org-team-wrap org-team-wrap-main">
              <div className="org-team-line"></div>
              <div className="org-team-grid">
                {chartModel.employees.map((member) => renderMiniCard(member, Boolean(member.isCurrentUser)))}
              </div>
            </div>
          </>
        )}

        {!hasEmployees && <p className="empty-message">Aucune equipe disponible pour le moment.</p>}
      </div>
    );
  };

  return (
    <div className="org-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="org-main">
        <section className="org-hero">
          <h2>
            Notre Structure <span>Academique</span>
          </h2>
          <p>
            Decouvrez la hierarchie organisationnelle d'Honoris United Universities avec une gouvernance unifiee pour un impact durable.
          </p>
        </section>

        <section className="organization-tree">
          {loading && <p className="loading-message">Chargement...</p>}
          {error && (
            <div className="error-box">
              <AlertCircle size={24} />
              <p className="error-message">{error}</p>
              <p className="error-help">
                Vous n'etes pas connecte. <a href="/signin">Connectez-vous ici</a>
              </p>
            </div>
          )}
          {!loading && !error && renderOrgContent()}
          {!loading && !error && !orgChart && (
            <p className="empty-message">Aucune donnee d'organigramme disponible.</p>
          )}
          {!loading && !error && orgChart && !["ORGANIZER", "EMPLOYEE"].includes(userRole) && (
            <div className="warning-box">
              <AlertCircle size={32} />
              <p>Votre role actuel ne permet pas d'afficher l'organigramme detaille.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}