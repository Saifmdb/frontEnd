import { useRef, useState } from "react";
import Navbar from "./components/navbarhome.jsx";
import Footer from "./components/footer.jsx";
import "./frontcss/home.css";

export default function Home() {
  const [activeNews, setActiveNews] = useState(0);
  const newsTrackRef = useRef(null);

  const newsItems = [
    {
      date: "18 Mars 2026",
      title: "Acceleration de la formation digitale dans le reseau Honoris",
      text: "Les institutions Honoris renforcent les parcours numeriques avec des modules axes IA, data et competences metiers pour mieux preparer les etudiants au marche du travail.",
      image: "/images/image1.png",
      alt: "Innovation pedagogique Honoris",
    },
    {
      date: "10 Mars 2026",
      title: "Renforcement des services employabilite pour les etudiants",
      text: "Honoris etend les dispositifs de coaching, stages et insertion professionnelle afin d'accompagner les diplomes vers des opportunites locales et internationales.",
      image: "/images/image33.png",
      alt: "Employabilite et accompagnement carriere",
    },
    {
      date: "01 Mars 2026",
      title: "Nouvelles initiatives de collaboration regionale",
      text: "Le reseau Honoris poursuit ses collaborations entre campus pour partager les meilleures pratiques pedagogiques et multiplier les opportunites de mobilite etudiante.",
      image: "/images/image222.png",
      alt: "Developpement du reseau Honoris en Afrique",
    },
    {
      date: "24 Fevrier 2026",
      title: "REGENT lance un iLeadLab a Bopasenatla Secondary School",
      text: "En Afrique du Sud, REGENT Business School a officialise le lancement d'un nouvel iLeadLab pour renforcer l'apprentissage numerique et l'acces aux competences du futur.",
      image: "/images/images55.jpg",
      alt: "Programme iLeadLab par REGENT",
    },
    {
      date: "21 Fevrier 2026",
      title: "EMSI obtient une accreditation pour son programme doctoral",
      text: "L'EMSI au Maroc annonce une accreditation majeure pour son programme doctoral en ingenierie et intelligence artificielle, consolidant son positionnement academique.",
      image: "/images/imageesprit.png",
      alt: "Accreditation doctorale EMSI",
    },
    {
      date: "11 Fevrier 2026",
      title: "EAC celebre sa 14e ceremonie de remise des diplomes",
      text: "L'EAC au Maroc a celebre sa 14e promotion dans une ceremonie reunissant etudiants, equipes pedagogiques et partenaires du reseau Honoris.",
      image: "/images/honorisgroup.jpg",
      alt: "Ceremonie de remise des diplomes EAC",
    },
  ];

  const scrollToNews = (targetIndex) => {
    const track = newsTrackRef.current;

    if (!track) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(targetIndex, newsItems.length - 1));
    const firstCard = track.querySelector("[data-news-card='true']");

    if (!firstCard) {
      setActiveNews(safeIndex);
      return;
    }

    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.gap || styles.columnGap || "0");
    const cardWidth = firstCard.getBoundingClientRect().width;
    const left = safeIndex * (cardWidth + gap);

    track.scrollTo({ left, behavior: "smooth" });
    setActiveNews(safeIndex);
  };

  const handleNewsScroll = () => {
    const track = newsTrackRef.current;

    if (!track) {
      return;
    }

    const firstCard = track.querySelector("[data-news-card='true']");
    if (!firstCard) {
      return;
    }

    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.gap || styles.columnGap || "0");
    const cardWidth = firstCard.getBoundingClientRect().width;
    const rawIndex = track.scrollLeft / (cardWidth + gap || 1);
    const computedIndex = Math.round(rawIndex);
    const safeIndex = Math.max(0, Math.min(computedIndex, newsItems.length - 1));

    if (safeIndex !== activeNews) {
      setActiveNews(safeIndex);
    }
  };

  const canGoPrev = activeNews > 0;
  const canGoNext = activeNews < newsItems.length - 1;

  return (
    <div className="home-page-shell">
      <Navbar />

      <main className="home-page-main">
        <section id="hero" className="home-page-hero">
          <img
            className="home-page-hero-bg"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJbPHDzkA6RZv0ZroaoCQUWoeVc5isw70z7qcGCK2cvDJ1tu8qwFKVVoZWI9kpuuvEBBDkBMT1rkl4JUcgI0a7purcmtY_3J1Ti7f_1YpKqnnBkBnYlU9QWm_0FMtFHaonI3HKYUQ9jwz-QX0hs2PA_m-4Qf-XWBJy3RFZxSxUeDcqPlc9PM4SwlLUCeACWDCippcNknBOx4Q3CqbBQluvvbXWUXoiWcL9qLtzaTDlBCjseZUAUrd8Aa93rYJ0jR8U_KUHEg8MSRQ"
            alt="Honoris campus"
          />
          <div className="home-page-hero-mask"></div>

          <div className="home-page-hero-content">
            <h1>
              Bienvenue sur <span>HONORIS</span>
            </h1>
            <p>
              Le premier reseau panafricain d&apos;enseignement superieur prive engage a former la prochaine generation de leaders africains pour un impact mondial.
            </p>
            <div className="home-page-hero-actions">
              <button type="button" className="home-page-btn-primary">En Savoir Plus</button>
              <button type="button" className="home-page-btn-glass">Decouvrir Nos campus</button>
            </div>
          </div>
        </section>

        <section id="services" className="home-page-news-section">
          <div className="home-page-news-head">
            <div>
              <span>Ecosysteme Honoris</span>
              <h2>NEWS FROM OUR NETWORK</h2>
            </div>
            <div className="home-page-news-nav">
              <button type="button" onClick={() => scrollToNews(activeNews - 1)} disabled={!canGoPrev} aria-label="Actualite precedente">&lt;</button>
              <button type="button" onClick={() => scrollToNews(activeNews + 1)} disabled={!canGoNext} aria-label="Actualite suivante">&gt;</button>
            </div>
          </div>

          <div className="home-page-news-track" ref={newsTrackRef} onScroll={handleNewsScroll}>
            {newsItems.map((item) => (
              <article className="home-page-news-card" data-news-card="true" key={item.title}>
                <div className="home-page-news-image-wrap">
                  <img src={item.image} alt={item.alt} />
                </div>
                <div className="home-page-news-content">
                  <span>{item.date}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <a href="#">Lire l&apos;article →</a>
                </div>
              </article>
            ))}
          </div>

          <div className="home-page-news-dots">
            {newsItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={index === activeNews ? "is-active" : ""}
                onClick={() => scrollToNews(index)}
                aria-label={`Aller a l'actualite ${index + 1}`}
              ></button>
            ))}
          </div>
        </section>

        <section id="contact" className="home-page-contact-section">
          <div className="home-page-contact-grid">
            <div>
              <span className="home-page-contact-kicker">Nous Contacter</span>
              <h2>Restons Connectes pour l&apos;Impact</h2>

              <div className="home-page-contact-list">
                <div className="home-page-contact-item">
                  <div className="home-page-contact-icon">📍</div>
                  <div>
                    <h4>Siege Regional</h4>
                    <p> Tunis, Tunisie, lac 1</p>
                  </div>
                </div>

                <div className="home-page-contact-item">
                  <div className="home-page-contact-icon">📞</div>
                  <div>
                    <h4>Telephone</h4>
                    <p>+216 71 79 66 79</p>
                  </div>
                </div>

                <div className="home-page-contact-item">
                  <div className="home-page-contact-icon">✉️</div>
                  <div>
                    <h4>Email</h4>
                    <p>contact@universitecentrale.tn</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-page-contact-form-card">
              <form className="home-page-contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="home-page-two-col">
                  <div>
                    <label>Prenom</label>
                    <input type="text" placeholder="Votre prenom" />
                  </div>
                  <div>
                    <label>Nom</label>
                    <input type="text" placeholder="Votre nom" />
                  </div>
                </div>

                <div>
                  <label>Email professionnel</label>
                  <input type="email" placeholder="Email" />
                </div>

                <div>
                  <label>Sujet</label>
                  <select>
                    <option>Demande d&apos;information generale</option>
                    <option>Inscription academique</option>
                    <option>Partenariats</option>
                  </select>
                </div>

                <div>
                  <label>Message</label>
                  <textarea rows="4" placeholder="Comment pouvons-nous vous aider ?"></textarea>
                </div>

                <button type="submit">Envoyer le message</button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
