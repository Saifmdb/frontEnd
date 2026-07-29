import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { ChevronDown, LogOut, Bell, Check, CheckCheck, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications, requestNotificationPermission } from "../../hooks/useNotifications.js";
import { useAuth } from "../../hooks/useAuth.js";
import "../frontcss/navbar.css";

export default function Navbar({ hideDisconnectBtn = false }) {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [userMatricule, setUserMatricule] = useState(null);
  const [userName, setUserName] = useState(null);
  
  const {
    notifications,
    unreadCount: notificationCount,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotifications
  } = useNotifications();
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Récupérer le rôle et matricule de l'utilisateur
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('employee_profile');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role);
        
        const fullName = user.full_name || user.first_name || profileData ? JSON.parse(profileData)?.full_name : null;
        setUserName(fullName || user.username || null);
        
        let matricule = user.matricule || user.profile?.matricule;
        let department = user.depatement || user.department || user.profile?.depatement || user.profile?.department || null;
        
        if (!matricule && profileData) {
          try {
            const profile = JSON.parse(profileData);
            matricule = profile.matricule;
            department = department || profile.depatement || profile.department || null;
            if (!fullName) setUserName(profile.full_name || user.username || null);
          } catch (e) {
            console.error("Erreur parsing employee_profile:", e);
          }
        }
        
        setUserMatricule(matricule);
        setUserDepartment(department ? String(department).toUpperCase() : null);
      } catch (e) {
        console.error("Erreur parsing user data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = () => {
    if (!isNotificationOpen) {
      refreshNotifications(); 
    }
    setIsNotificationOpen(!isNotificationOpen);
  };

  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Obtenir l'icône de notification selon le type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'DEMANDE_APPROUVEE':
        return <span className="notif-icon approved">✓</span>;
      case 'DEMANDE_REFUSEE':
        return <span className="notif-icon refused">✗</span>;
      case 'NOUVELLE_DEMANDE':
        return <span className="notif-icon new">📋</span>;
      default:
        return <span className="notif-icon">🔔</span>;
    }
  };

  const getServicesGroups = () => {
    const hasRhLicense = userRole === 'RH' || userDepartment === 'RH';
    const isRhManager = userRole === 'ORGANIZER' && userDepartment === 'RH';

    const reunionsItems = [
      { label: "Reunions", value: "reunions-calendar", path: "/reunions" },
    ];

    if (userRole === 'ORGANIZER') {
      reunionsItems.push({
        label: "Nouvelle Reunion",
        value: "create-reunion-google",
        path: "/reunions/create",
      });
    }

    const congesItems = [
      {
        label: "Demande de congé",
        value: "demande-conge",
        path: `/demande-conge/${userMatricule}`,
        matchPrefix: "/demande-conge",
      },
      { label: "Mes Conges", value: "historique-conges-user", path: "/conges" },
    ];

    if (userRole === 'ORGANIZER' || userRole === 'ADMIN') {
      congesItems.push({
        label: "Gestion des congés",
        value: "gestion-conges",
        path: `/gestion-conges/${userMatricule}`,
        matchPrefix: "/gestion-conges",
      });
    }
    if (hasRhLicense) {
      congesItems.push({
        label: "Historique des congés",
        value: "historique-conges",
        path: "/historique-conges",
      });
    }

    const financeItems = [];
    if (userRole === 'ADMIN' || hasRhLicense) {
      financeItems.push({
        label: "Gestion des demandes de crédit",
        value: "gestion-demandes-credit",
        path: "/gestion-demandes-credit",
        matchPrefix: "/gestion-demandes-credit",
      });
    }
    if (userRole === 'ADMIN' || isRhManager) {
      financeItems.push({
        label: "Gestion des avances sur salaire",
        value: "gestion-avances-salaire",
        path: "/gestion-avances-salaire",
        matchPrefix: "/gestion-avances-salaire",
      });
    }
    if (!isRhManager && userRole !== 'ADMIN') {
      financeItems.push({
        label: "Crédit bancaire",
        value: "credit-bancaire",
        path: "/credit-bancaire",
        matchPrefix: "/credit-bancaire",
      });
      financeItems.push({
        label: "Avance sur salaire",
        value: "avance-salaire",
        path: "/avance-salaire",
        matchPrefix: "/avance-salaire",
      });
      financeItems.push({
        label: "Historique avances",
        value: "historique-avance",
        path: "/historique-avance",
        matchPrefix: "/historique-avance",
      });
    }

    const reclamationItems = [];
    if (userRole === 'EMPLOYEE' || userRole === 'ORGANIZER' || userRole === 'ADMIN') {
      reclamationItems.push({
        label: "Demande Réclamation",
        value: "demande-reclamation",
        path: "/reclamation",
      });
      reclamationItems.push({
        label: "Mes Réclamations",
        value: "mes-reclamations",
        path: "/mes-reclamations",
      });
    }
    if (hasRhLicense || userRole === 'ADMIN') {
      reclamationItems.push({
        label: "Gestion Réclamations",
        value: "gestion-reclamations",
        path: "/reclamation-responsable",
        matchPrefix: "/reclamation-responsable",
      });
    }

    const organisationItems = [{ label: "Organigramme", value: "organigramme", path: "/manager" }];
    if (hasRhLicense) {
      organisationItems.push({
        label: "Documents RH",
        value: "gestion-documents-rh",
        path: "/gestion-documents-rh",
      });
       organisationItems.push({
    label: "Gestion Demande Document",
    value: "gestion-demande-document",
    path: "/gestion-demande-document",
    matchPrefix: "/gestion-demande-document",
  });
      organisationItems.push({
        label: "Procedure",
        value: "procedure-rh",
        path: "/procedure",
      });
    }

    // Ajout : Demande de document RH pour manager et employés digital uniquement
    const demandeDocumentItem = {
      label: "Demande Document RH",
      value: "demande-document",
      path: "/demande-document",
      matchPrefix: "/demande-document",
    };
    const historiqueDocumentItem = {
      label: "Historique Demande Document",
      value: "historique-demande-document",
      path: "/historique-demande-document",
      matchPrefix: "/historique-demande-document",
    };
    const normalizedDepartment = userDepartment ? String(userDepartment).toUpperCase() : "";
    const isDigitalEmployee = userRole === "EMPLOYEE" && (normalizedDepartment.includes("DIGITAL") || normalizedDepartment.includes("DIGITALE"));
    const isManager = userRole === "ORGANIZER";

    if (isManager || isDigitalEmployee) {
      organisationItems.push(demandeDocumentItem);
      organisationItems.push(historiqueDocumentItem);
    }

    return [
      { title: "Reunions", items: reunionsItems },
      { title: "Conges", items: congesItems },
      { title: "Financement", items: financeItems },
      { title: "Reclamations", items: reclamationItems },
      { title: "Organisation", items: organisationItems },
    ].filter((group) => group.items.length > 0);
  };


  const handleServiceSelect = (option) => {
    setIsServicesDropdownOpen(false);
    
    if (option.path) {
      navigate(option.path);
    }
  };

const handleLogout = async () => {
  try {
    setIsLoggingOut(true);

    // Appeler l'API de déconnexion backend (invalide la session côté serveur)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn("⚠️ Déconnexion backend non confirmée:", response.status);
      }
    } catch (apiError) {
      console.warn("⚠️ Erreur API de déconnexion:", apiError);
    }

    // Nettoyage local (MSAL + clés d'auth) centralisé dans useAuth().logout()
    await logout();

    // Supprimer les cookies Django
    document.cookie.split(";").forEach(cookie => {
      const [name] = cookie.trim().split("=");
      if (name.includes("sessionid") || name.includes("csrftoken")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    window.location.href = '/signin?logout=true&t=' + Date.now();

  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion:", error);
    await logout();
    window.location.href = '/signin';
  } finally {
    setIsLoggingOut(false);
  }
};

  // Fonction pour récupérer le token CSRF
  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const currentPath = location.pathname;
  const isServicesActive = currentPath !== '/welcome' && currentPath !== '/chatbot';
  const servicesGroups = getServicesGroups();

  const isOptionActive = (option) => {
    if (!option?.path) return false;
    if (currentPath === option.path) return true;
    if (option.matchPrefix && currentPath.startsWith(option.matchPrefix)) return true;
    return false;
  };

  return (
    <nav className="navbar-wrapper">
      <div className="navbar-main">
        <div className="navbar-main-container">
          <div className="navbar-brand">
            <span className="navbar-brand-name">HONORIS</span>
            <span className="navbar-brand-sub">United Universities</span>
          </div>

          <div className="navbar-left">
            <Link 
              to="/welcome" 
              className={`nav-link ${currentPath === '/welcome' ? 'active' : ''}`}
            >
              Accueil
            </Link>

            <div className="services-dropdown-wrapper">
              <button
                className={`nav-link dropdown-trigger ${isServicesActive ? 'active' : ''}`}
                onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
              >
                <span>Services</span>
                <ChevronDown
                  size={16}
                  className={`dropdown-chevron ${isServicesDropdownOpen ? "open" : ""}`}
                />
              </button>

              {isServicesDropdownOpen && (
                <div className="dropdown-menu-services">
                  {servicesGroups.map((group) => (
                    <div className="dropdown-services-group" key={group.title}>
                      <p className="dropdown-services-title">{group.title}</p>
                      <div className="dropdown-services-items">
                        {group.items.map((option) => (
                          <button
                            key={option.value}
                            className={`dropdown-menu-item ${isOptionActive(option) ? 'active' : ''}`}
                            onClick={() => handleServiceSelect(option)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Link 
              to="/chatbot" 
              className={`nav-link ${currentPath === '/chatbot' ? 'active' : ''}`}
            >
              ChatBot
            </Link>
          </div>

          <div className="navbar-right">
            <div className="notification-wrapper" ref={notificationRef}>
              <button 
                className="notification-button"
                onClick={toggleNotifications}
                title="Notifications"
              >
                <Bell size={20} className="notification-icon" />
                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    {notifications.some(n => !n.lu) && (
                      <button 
                        className="mark-all-read-btn"
                        onClick={markAllAsRead}
                        title="Marquer tout comme lu"
                      >
                        <CheckCheck size={16} />
                        Tout lire
                      </button>
                    )}
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={32} className="empty-icon" />
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${!notif.lu ? 'unread' : ''}`}
                          onClick={() => !notif.lu && markAsRead(notif.id)}
                        >
                          <div className="notification-icon-wrapper">
                            {getNotificationIcon(notif.type_notification)}
                          </div>
                          <div className="notification-content">
                            <p className="notification-title">{notif.titre}</p>
                            <p className="notification-message">{notif.message}</p>
                            <span className="notification-time">
                              {formatRelativeDate(notif.date_creation)}
                            </span>
                          </div>
                          {!notif.lu && (
                            <button 
                              className="mark-read-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                              }}
                              title="Marquer comme lu"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="navbar-divider-v"></div>

            <div className="navbar-profile">
              <div className="navbar-profile-info">
                <p className="navbar-profile-name">{userName || 'Employé'}</p>
                <p className="navbar-profile-dept">{userDepartment || 'Honoris Network'}</p>
              </div>
              <div className="navbar-avatar">
                <User size={20} />
              </div>
              {!hideDisconnectBtn && (
                <button 
                  className={`disconnect-button ${isLoggingOut ? 'logging-out' : ''}`}
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="logout-spinner"></div>
                    </>
                  ) : (
                    <LogOut size={18} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="navbar-divider"></div>
    </nav>
  );
}

Navbar.propTypes = {
  hideDisconnectBtn: PropTypes.bool,
};