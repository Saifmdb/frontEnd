import React from "react";
import { Link } from "react-router-dom";
import "../frontcss/authnav.css";

export default function AuthNavbar() {
  return (
    <header className="auth-nav-wrapper">
      <nav className="auth-nav-bar">
        <div className="auth-nav-inner">
          <Link to="/" className="auth-nav-brand">
            <span className="auth-nav-brand-name">HONORIS</span>
            <span className="auth-nav-brand-sub">United Universities</span>
          </Link>

          <div className="auth-nav-links" role="navigation" aria-label="Navigation principale">
            <Link to="/" className="auth-nav-link">
              Accueil
            </Link>
            <a href="/#services" className="auth-nav-link">
              Services
            </a>
            <a href="/#contact" className="auth-nav-link">
              Contact
            </a>
          </div>
        </div>

        <div className="auth-nav-divider"></div>
      </nav>
    </header>
  );
}