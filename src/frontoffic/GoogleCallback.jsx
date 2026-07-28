import { useEffect } from "react";

function GoogleCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    console.log("🔥 CODE:", code);

    if (code) {
      fetch("http://localhost:8000/api/google/callback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(res => res.json())
        .then(data => {
          console.log("TOKENS:", data);
        });
    }
  }, []);

  return <h2>Connexion Google en cours...</h2>;
}

export default GoogleCallback;
