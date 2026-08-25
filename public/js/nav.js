// nav.js — construit la barre de navigation (site 100% statique, sans comptes)
// Le body doit avoir un attribut data-page="home|dvd|diskdur" pour l'onglet actif.

const NAV_LINKS = [
  { page: 'home', href: '/index.html', label: 'Accueil' },
  { page: 'dvd', href: '/dvd.html', label: 'DVD' },
  { page: 'diskdur', href: '/diskdur.html', label: 'Disque dur' },
];

function initNav() {
  const mount = document.getElementById('nav-placeholder');
  const currentPage = document.body.dataset.page || '';

  const linksHtml = NAV_LINKS.map(l => `
    <a class="nav__link ${l.page === currentPage ? 'active' : ''}" href="${l.href}">${l.label}</a>
  `).join('');

  mount.innerHTML = `
    <nav class="nav">
      <a class="nav__brand" href="/index.html"><span>Ciné</span>Club</a>
      <button class="nav__burger" id="burger" aria-label="Menu">☰</button>
      <div class="nav__links" id="nav-links">${linksHtml}</div>
    </nav>
    <div class="sprocket-strip"></div>
  `;

  document.getElementById('burger').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });
}

document.addEventListener('DOMContentLoaded', initNav);
