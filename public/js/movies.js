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

function normalizeSearch(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function filterMovies({ search, type, genre, platform, sortBy = 'name', sortDir = 'asc' } = {}) {
  const searchNorm = search ? normalizeSearch(search) : '';
  const filtered = ALL_MOVIES.filter(m => {
    if (platform && m.platform !== platform) return false;
    if (type && m.type !== type) return false;
    if (genre && !(m.genre || '').split(',').map(s => s.trim()).includes(genre)) return false;
    if (searchNorm && !normalizeSearch(m.name).includes(searchNorm)) return false;
    return true;
  });

  const dir = sortDir === 'desc' ? -1 : 1;
  filtered.sort((a, b) => {
    let cmp;
    if (sortBy === 'genre') {
      const ga = (a.genre || '').split(',')[0].trim();
      const gb = (b.genre || '').split(',')[0].trim();
      cmp = ga.localeCompare(gb, 'fr', { sensitivity: 'base' });
      if (cmp === 0) cmp = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    } else {
      cmp = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    }
    return cmp * dir;
  });

  return filtered;
}

// ---------- Regroupement par saga (ex: Harry Potter 1, 2, 3…) ----------

function normalizeKey(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Sagas connues qui n'ont pas forcément de numéro ou de tiret dans le titre
// (ex: "007 - Skyfall", "Fast & Furious 6", "Mission Impossible : Fallout"...).
// Triée par longueur décroissante pour matcher l'alias le plus spécifique en premier.
const KNOWN_FRANCHISES = [
  'harry potter',
  'le seigneur des anneaux',
  'seigneur des anneaux',
  'le hobbit',
  'star wars',
  'jason bourne',
  'alvin et les chipmunks',
  'asterix',
  'baby boss',
  'balto',
  'transporter',
  'james bond',
  '007',
  'mission impossible',
  'jack reacher',
  'fast and furious',
  'fast furious',
  'the matrix',
  'matrix',
  'transformers',
  'transformer',
  'barbie',
  'mickey',
  'shrek',
  'toy story',
  'cars',
  'indiana jones',
  'rocky',
  'terminator',
  'die hard',
  'jurassic park',
  'jurassic world',
  'pirates des caraibes',
  'avengers',
  'spider man',
  'batman',
  'x men',
  'dragons',
].sort((a, b) => b.length - a.length);

function matchesFranchiseAlias(normName, alias) {
  return (` ${normName} `).includes(` ${alias} `);
}

function franchiseKey(name) {
  const cleaned = (name || '').replace(/\s*\(\d{4}\)\s*/g, ' ').trim();
  const normFull = normalizeKey(cleaned);

  for (const alias of KNOWN_FRANCHISES) {
    if (matchesFranchiseAlias(normFull, alias)) {
      return alias;
    }
  }

  // ex: "Harry Potter 3 - et le Prisonnier d'Askaban" -> base "Harry Potter"
  const m = cleaned.match(/^(.*?)[\s:\-–]+\b(\d{1,2}|I{1,3}|IV|VI{0,3}|IX|X)\b/);
  if (m && m[1].trim().length >= 3) {
    return normalizeKey(m[1]);
  }
  // ex: "Le Seigneur des Anneaux - La Communauté de l'anneau" -> base "Le Seigneur des Anneaux"
  const dashIdx = cleaned.indexOf(' - ');
  if (dashIdx > 2) {
    return normalizeKey(cleaned.slice(0, dashIdx));
  }
  return normFull;
}

function getRelatedMovies(movie) {
  const key = franchiseKey(movie.name);
  if (!key) return [];
  return ALL_MOVIES
    .filter(m => m.id !== movie.id && franchiseKey(m.name) === key)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));
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
        <span class="movie-card__badge ${m.platform === 'disque dur' ? 'movie-card__badge--diskdur' : 'movie-card__badge--dvd'}">${escapeHtml(m.platform === 'disque dur' ? 'Disque dur' : m.platform)}</span>
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
  overlay.scrollTop = 0;
  content.innerHTML = movie ? movieModalHtml(movie) : `<div class="modal__body">Film introuvable.</div>`;

  content.querySelectorAll('.related-card').forEach(card => {
    const open = () => openMovieModal(Number(card.dataset.id));
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });
}

function relatedMovieCardHtml(m) {
  const poster = m.image_url
    ? `<img src="${escapeHtml(m.image_url)}" alt="Affiche de ${escapeHtml(m.name)}" loading="lazy" onerror="this.parentElement.innerHTML='${posterPlaceholder(m.name).replace(/'/g, "\\'")}'">`
    : posterPlaceholder(m.name);

  return `
    <div class="related-card" data-id="${m.id}" tabindex="0" role="button" aria-label="Voir la fiche de ${escapeHtml(m.name)}">
      <div class="related-card__poster">${poster}</div>
      <p class="related-card__title">${escapeHtml(m.name)}</p>
    </div>
  `;
}

function movieModalHtml(m) {
  const poster = m.image_url
    ? `<img src="${escapeHtml(m.image_url)}" alt="Affiche de ${escapeHtml(m.name)}">`
    : posterPlaceholder(m.name);

  const genres = (m.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const related = getRelatedMovies(m);
  const relatedHtml = related.length ? `
    <div class="modal__related">
      <p class="modal__section-title">Dans la même saga</p>
      <div class="related-row">
        ${related.map(relatedMovieCardHtml).join('')}
      </div>
    </div>
  ` : '';

  return `
    <button class="modal__close" onclick="closeMovieModal()" aria-label="Fermer">✕</button>
    <div class="modal__top">
      <div class="modal__poster">${poster}</div>
      <div>
        <h2 class="modal__title">${escapeHtml(m.name)}</h2>
        <div class="modal__tags">
          ${m.type ? `<span class="tag tag-gold">${escapeHtml(m.type)}</span>` : ''}
          ${genres.map(g => `<span class="tag">${escapeHtml(g)}</span>`).join('')}
          <span class="tag ${m.platform === 'disque dur' ? 'tag-diskdur' : 'tag-dvd'}">${escapeHtml(m.platform === 'disque dur' ? 'Disque dur' : m.platform)}</span>
        </div>
        <div class="modal__info">
          <div><strong>Durée :</strong> ${escapeHtml(m.length || 'Non renseignée')}</div>
          ${m.trailer_url ? `<div class="modal__trailer-row"><a class="btn btn-gold btn-trailer" href="${escapeHtml(m.trailer_url)}" target="_blank" rel="noopener">▶ Voir la bande-annonce</a></div>` : ''}
        </div>
      </div>
    </div>
    ${relatedHtml}
  `;
}
