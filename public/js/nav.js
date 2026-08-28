// nav.js — construit la barre de navigation (site 100% statique, sans comptes)
// Un seul point d'entrée désormais : la page d'accueil, où les filtres
// (plateforme, type, genre, recherche) remplacent les anciennes pages
// dédiées DVD / Disque dur.

function initNav() {
  const mount = document.getElementById('nav-placeholder');

  mount.innerHTML = `
    <nav class="nav">
      <a class="nav__brand" href="/index.html"><span>Ciné</span>Club</a>
    </nav>
    <div class="sprocket-strip"></div>
  `;
}

document.addEventListener('DOMContentLoaded', initNav);
