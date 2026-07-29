import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications, requestNotificationPermission } from '../../hooks/useNotifications';
import './frontcss/notificationBell.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  // Demander la permission pour les notifications au premier rendu
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refresh();
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.lu) {
      markAsRead(notification.id);
    }
    // Naviguer vers la page correspondante si nécessaire
    // navigate(`/demande-conge/${notification.demande_conge_id}`);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NOUVELLE_DEMANDE':
        return '📋';
      case 'DEMANDE_APPROUVEE':
        return '✅';
      case 'DEMANDE_REFUSEE':
        return '❌';
      case 'RAPPEL':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Moins d'une minute
    if (diff < 60000) return 'À l\'instant';
    // Moins d'une heure
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    // Moins d'un jour
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    // Sinon afficher la date
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleDropdown}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="connection-indicator disconnected" title="Déconnecté" />
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="Tout marquer comme lu"
              >
                <CheckCheck size={16} />
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <Bell size={32} />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.lu ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.titre}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatDate(notif.date_creation)}
                      </span>
                      {notif.expediteur && (
                        <span className="notification-sender">
                          de {notif.expediteur.full_name || notif.expediteur.username}
                        </span>
                      )}
                    </div>
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

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="view-all-btn">
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
