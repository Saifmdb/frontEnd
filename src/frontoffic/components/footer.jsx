import React from "react";
import "../frontcss/footer.css";

export default function Footer() {
  return (
    <footer className="home-footer-wrapper">
      <div className="home-footer-main">
        <div className="home-footer-top">
          <div className="home-footer-brand-block">
            <h4>HONORIS UNITED UNIVERSITIES</h4>
            <p>
              Premier reseau panafricain d'enseignement superieur prive engage a former la prochaine generation de leaders pour un impact mondial.
            </p>
          </div>

          <div className="home-footer-links-grid">
            <div>
              <h5>Navigation</h5>
              <ul>
                <li><a href="#">Accueil</a></li>
                <li><a href="#">Nos Services</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">ChatBot</a></li>
              </ul>
            </div>
            <div>
              <h5>Ressources</h5>
              <ul>
                <li><a href="#">Mentions Legales</a></li>
                <li><a href="#">Politique de Confidentialite</a></li>
                <li><a href="#">Carrieres</a></li>
                <li><a href="#">Reseau</a></li>
              </ul>
            </div>
            <div>
              <h5>Reseaux Sociaux</h5>
              <ul>
                <li><a href="#">LinkedIn</a></li>
                <li><a href="#">Instagram</a></li>
                <li><a href="#">Facebook</a></li>
                <li><a href="#">X (Twitter)</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer-bottom">
        <p>© 2024 Honoris United Universities. Education for Impact.</p>
        <div>
          <a href="#">Conditions d'utilisation</a>
          <a href="#">Accessibilite</a>
          <a href="#">Plan du site</a>
        </div>
      </div>
    </footer>
  );
}