import React from "react";
import { useNavigate } from "react-router-dom";
import "../frontcss/navbarhome.css";

export default function Navbar() {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="home-nav-wrapper">
      <nav className="home-nav-bar">
        <div className="home-nav-inner">
          <div className="home-nav-brand">
            <span className="home-nav-brand-name">HONORIS</span>
            <span className="home-nav-brand-sub">United Universities</span>
          </div>

          <div className="home-nav-links" role="navigation" aria-label="Navigation principale">
            <button onClick={() => scrollToSection("hero")} className="home-nav-link is-active">
              Accueil
            </button>

            <button onClick={() => scrollToSection("services")} className="home-nav-link">
              Services
            </button>

            <button onClick={() => scrollToSection("contact")} className="home-nav-link">
              Contact
            </button>
          </div>

          <button className="home-nav-login" onClick={() => navigate('/signin')}>
            Se Connecter
          </button>
        </div>

        <div className="home-nav-divider"></div>
      </nav>
    </header>
  );
}