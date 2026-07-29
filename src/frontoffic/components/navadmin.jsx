import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "../frontcss/NavAdmin.css";

export default function NavAdmin({
  profileInfo,
  onLogout,
  active = "dashboard",
  showAddUser = false,
  onAddUser,
}) {
  const handleAddUser = () => {
    if (onAddUser) {
      onAddUser();
    }
  };

  return (
    <aside className="hr-sidebar">
      <div className="hr-brand">
        <h1 className="hr-brand-title">Honoris Admin</h1>
        <p className="hr-brand-subtitle">Network Management</p>
      </div>

      <nav className="hr-nav">
        <Link
          className={`hr-nav-link${active === "dashboard" ? " is-active" : ""}`}
          to="/dashboard"
        >
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </Link>
        <Link
          className={`hr-nav-link${active === "users" ? " is-active" : ""}`}
          to="/user-manager"
        >
          <span className="material-symbols-outlined">group</span>
          User Management
        </Link>
      </nav>

      <div className="hr-sidebar-footer">
        {showAddUser && (
          <button className="hr-add-user" type="button" onClick={handleAddUser}>
            <span className="material-symbols-outlined">add</span>
            <span>Add New User</span>
          </button>
        )}
        <div className="hr-profile">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm8h0CVJCQLnEMfWQpDZPXqPVUUoQffy9zQAMfEVB4GH1nyR9PZmVxIqA2PNRYvPWEjfsTaaFIYOgyb0RuxxjPNMXRHUs3E6-VgFGzpeuDr4YJXom_7wdidhWyIVNJ9ktyX1uGFv29swYYABs5OKEao8vv2nJ4T0kiFb0Xcj3CEfBj8DeHTjnRZqRNOTKq4BGx3tUMEbJbnGv3YZ6KA1qRAwkJcLLZfajcLzePgN-eW-fELpndmJYu3ghmWtqI9b1rHCMcKcE7W_Y"
            alt="Admin Avatar"
          />
          <div className="hr-profile-meta">
            <strong>{profileInfo.name}</strong>
            <span>{profileInfo.role}</span>
          </div>
        </div>
        <a
          className="hr-nav-link"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onLogout();
          }}
        >
          <span className="material-symbols-outlined">logout</span>
          Logout
        </a>
      </div>
    </aside>
  );
}

NavAdmin.propTypes = {
  profileInfo: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
  active: PropTypes.string,
  showAddUser: PropTypes.bool,
  onAddUser: PropTypes.func,
};
