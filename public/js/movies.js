// movies.js — grille de films + fiche détaillée (modal), 100% statique (aucun backend)

let ALL_MOVIES = [];
let MOVIES_LOADED = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function loadAllMovies() {
  if (!MOVIES_LOADED) {
    MOVIES_LOADED = fetch('/data/movies.json')
      .then(res => res.json())
      .then(data => { ALL_MOVIES = data; return data; });
  }
  return MOVIES_LOADED;
}

function filterMovies({ search, type, genre, platform } = {}) {
  return ALL_MOVIES.filter(m => {
    if (platform && m.platform !== platform) return false;
    if (type && m.type !== type) return false;
    if (genre && !(m.genre || '').split(',').map(s => s.trim()).includes(genre)) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

function posterPlaceholder(name) {
  return `<span>${escapeHtml(name)}</span>`;
}

function movieCardHtml(m) {
  const poster = m.image_url
    ? `<img src="${escapeHtml(m.image_url)}" alt="Affiche de ${escapeHtml(m.name)}" loading="lazy" onerror="this.parentElement.innerHTML='${posterPlaceholder(m.name).replace(/'/g, "\\'")}'">`
    : posterPlaceholder(m.name);

  return `
    <div class="movie-card" data-id="${m.id}" tabindex="0" role="button" aria-label="Voir la fiche de ${escapeHtml(m.name)}">
      <div class="movie-card__poster">
        ${poster}
        <span class="movie-card__badge">${escapeHtml(m.platform === 'disque dur' ? 'Disque dur' : m.platform)}</span>
      </div>
      <div class="movie-card__body">
        <p class="movie-card__title">${escapeHtml(m.name)}</p>
        <p class="movie-card__meta">${escapeHtml(m.type || '')}${m.genre ? ' · ' + escapeHtml(m.genre.split(',')[0].trim()) : ''}</p>
      </div>
    </div>
  `;
}

function renderMovieGrid(container, movies) {
  if (!movies.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Aucun film ici</h3>
        <p>Essayez d'autres filtres ou une autre recherche.</p>
      </div>`;
    return;
  }

  container.innerHTML = movies.map(movieCardHtml).join('');
  container.querySelectorAll('.movie-card').forEach(card => {
    const open = () => openMovieModal(Number(card.dataset.id));
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });
}

function populateFilterOptions(typeSelect, genreSelect, movies) {
  const source = movies || ALL_MOVIES;
  const types = Array.from(new Set(source.map(m => m.type).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
  const genreSet = new Set();
  source.forEach(m => (m.genre || '').split(',').map(s => s.trim()).filter(Boolean).forEach(g => genreSet.add(g)));
  const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'fr'));

  if (typeSelect) {
    const current = typeSelect.value;
    typeSelect.innerHTML = '<option value="">Tous les types</option>' +
      types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    typeSelect.value = current;
  }
  if (genreSelect) {
    const current = genreSelect.value;
    genreSelect.innerHTML = '<option value="">Tous les genres</option>' +
      genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    genreSelect.value = current;
  }
}

// ---------- Modal fiche film ----------

function ensureModalMount() {
  let overlay = document.getElementById('movie-modal-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'movie-modal-overlay';
  overlay.className = 'modal-overlay hidden';
  overlay.innerHTML = `<div class="modal" id="movie-modal-content"></div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMovieModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMovieModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

function closeMovieModal() {
  const overlay = document.getElementById('movie-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

async function openMovieModal(id) {
  const overlay = ensureModalMount();
  const content = document.getElementById('movie-modal-content');
  await loadAllMovies();
  const movie = ALL_MOVIES.find(m => m.id === id);
  overlay.classList.remove('hidden');
  content.innerHTML = movie ? movieModalHtml(movie) : `<div class="modal__body">Film introuvable.</div>`;
}

function movieModalHtml(m) {
  const poster = m.image_url
    ? `<img src="${escapeHtml(m.image_url)}" alt="Affiche de ${escapeHtml(m.name)}">`
    : posterPlaceholder(m.name);

  const genres = (m.genre || '').split(',').map(g => g.trim()).filter(Boolean);

  return `
    <button class="modal__close" onclick="closeMovieModal()" aria-label="Fermer">✕</button>
    <div class="modal__top">
      <div class="modal__poster">${poster}</div>
      <div>
        <h2 class="modal__title">${escapeHtml(m.name)}</h2>
        <div class="modal__tags">
          ${m.type ? `<span class="tag tag-gold">${escapeHtml(m.type)}</span>` : ''}
          ${genres.map(g => `<span class="tag">${escapeHtml(g)}</span>`).join('')}
          <span class="tag tag-velvet">${escapeHtml(m.platform === 'disque dur' ? 'Disque dur' : m.platform)}</span>
        </div>
        <div class="modal__info">
          <div><strong>Durée :</strong> ${escapeHtml(m.length || 'Non renseignée')}</div>
          ${m.trailer_url ? `<div><a href="${escapeHtml(m.trailer_url)}" target="_blank" rel="noopener">▶ Voir la bande-annonce</a></div>` : ''}
        </div>
      </div>
    </div>
  `;
}
