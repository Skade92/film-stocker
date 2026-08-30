// movies.js — grille de films + fiche détaillée (modal), 100% statique (aucun backend)

let ALL_MOVIES = [];
let MOVIES_LOADED = null;

const PLATFORM_LABELS = {
  'DVD': 'DVD',
  'disque dur': 'Disque dur',
  'YouTube': 'YouTube',
  'Prime video': 'Prime Video',
};

const PLATFORM_CLASS = {
  'DVD': 'dvd',
  'disque dur': 'diskdur',
  'YouTube': 'youtube',
  'Prime video': 'primevideo',
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// Corrige les incohérences de casse toutes simples dans les données
// (ex: "film" vs "Film", "thriller" vs "Thriller") sans toucher aux valeurs
// qui ont volontairement une casse particulière (ex: "Sci-Fi").
function normalizeLabel(str) {
  const s = (str || '').trim();
  if (!s) return s;
  return s === s.toLowerCase() ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Un film peut avoir plusieurs genres dans un seul champ, séparés par "/"
// (ex: "Action / Thriller / Drame") : on les éclate en une liste propre.
function splitGenres(genreStr) {
  return (genreStr || '')
    .split('/')
    .map(g => normalizeLabel(g))
    .filter(Boolean);
}

async function loadAllMovies() {
  if (!MOVIES_LOADED) {
    MOVIES_LOADED = fetch('/data/movies.json')
      .then(res => res.json())
      .then(data => {
        // L'id est régénéré automatiquement à partir de la position dans le
        // fichier : peu importe l'ordre ou les ids présents dans movies.json,
        // pas besoin d'y toucher en ajoutant des films (même sans champ "id",
        // ou en les mettant n'importe où dans le fichier).
        data.forEach((m, i) => {
          m.id = i + 1;
          m.type = normalizeLabel(m.type);
        });
        ALL_MOVIES = data;
        return data;
      });
  }
  return MOVIES_LOADED;
}

function normalizeSearch(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Un film peut être sur plusieurs plateformes (ex: "disque dur" + "DVD") :
// il doit apparaître dans les résultats dès que l'une de ses plateformes
// correspond au filtre choisi.
function filterMovies({ search, type, genre, platform, sortBy = 'name', sortDir = 'asc' } = {}) {
  const searchNorm = search ? normalizeSearch(search) : '';
  const filtered = ALL_MOVIES.filter(m => {
    if (platform && !(m.platforms || []).includes(platform)) return false;
    if (type && m.type !== type) return false;
    if (genre && !splitGenres(m.genre).includes(genre)) return false;
    if (searchNorm && !normalizeSearch(m.name).includes(searchNorm)) return false;
    return true;
  });

  const dir = sortDir === 'desc' ? -1 : 1;
  filtered.sort((a, b) => {
    let cmp;
    if (sortBy === 'genre') {
      const ga = splitGenres(a.genre)[0] || '';
      const gb = splitGenres(b.genre)[0] || '';
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
// `aliases` : les bouts de titre (normalisés, sans accents) qui rattachent un
// film à la saga — peu importe où ils apparaissent dans le titre.
// `order` (optionnel) : quand le tri alphabétique/numérique par défaut ne
// donne pas le bon ordre chronologique (ex: les films ne portent pas de
// numéro dans leur titre), on force l'ordre ici via des bouts de titre
// distinctifs, du premier au dernier film de la saga.
const FRANCHISES = [
  { key: 'harry-potter', aliases: ['harry potter'] },
  { key: 'seigneur-des-anneaux', aliases: ['le seigneur des anneaux', 'seigneur des anneaux'] },
  { key: 'hobbit', aliases: ['le hobbit'] },
  { key: 'star-wars', aliases: ['star wars'] },
  { key: 'jason-bourne', aliases: ['jason bourne', 'dans la peau'] },
  { key: 'alvin', aliases: ['alvin et les chipmunks'] },
  { key: 'asterix', aliases: ['asterix'] },
  { key: 'baby-boss', aliases: ['baby boss'] },
  { key: 'balto', aliases: ['balto'] },
  { key: 'transporter', aliases: ['transporter', 'transporteur'] },
  { key: 'james-bond', aliases: ['james bond', '007'] },
  { key: 'mission-impossible', aliases: ['mission impossible'] },
  { key: 'jack-reacher', aliases: ['jack reacher'] },
  { key: 'fast-furious', aliases: ['fast and furious', 'fast furious'] },
  { key: 'matrix', aliases: ['the matrix', 'matrix'] },
  { key: 'transformers', aliases: ['transformers', 'transformer'] },
  { key: 'barbie', aliases: ['barbie'] },
  { key: 'mickey', aliases: ['mickey'] },
  { key: 'shrek', aliases: ['shrek'] },
  { key: 'toy-story', aliases: ['toy story'] },
  { key: 'cars', aliases: ['cars'] },
  { key: 'Batman', aliases: ['Dark Knight'] },
  { key: 'Les 4 fantastiques', aliases: ['Les 4 fantastiques'] },
  {
    key: 'indiana-jones', aliases: ['indiana jones'],
    order: ['arche perdue', 'temple maudit', 'derniere croisade', 'royaume du crane de cristal'],
  },
  { key: 'rocky', aliases: ['rocky'] },
  { key: 'terminator', aliases: ['terminator'] },
  { key: 'die-hard', aliases: ['die hard'] },
  { key: 'jurassic', aliases: ['jurassic park', 'jurassic world'] },
  { key: 'pirates-caraibes', aliases: ['pirates des caraibes'] },
  { key: 'avengers', aliases: ['avengers'] },
  { key: 'spider-man', aliases: ['spider man'] },
  { key: 'batman', aliases: ['batman'] },
  { key: 'x-men', aliases: ['x men'] },
  { key: 'dragons', aliases: ['dragon', 'dragons'] },
  { key: 'alien', aliases: ['alien', 'aliens'] },
  { key: 'braquage', aliases: ['braquage'] },
  { key: 'hotel-transylvania', aliases: ['hotel transylvania', 'hotel transylvanie'] },
  { key: 'age-de-glace', aliases: ['age de glace'] },
  { key: 'En Territoire Ennemi', aliases: ['En Territoire Ennemi'] },
  {
    key: 'clochette', aliases: ['clochette'],
    order: ['la fee clochette', 'secret des fees', 'tournoi des fees', 'expedition feerique', 'et les pirates', 'creature legendaire'],
  },
  {
    key: 'gendarme', aliases: ['gendarme'],
    order: ['saint tropez', 'new york', 'se marie', 'en balade', 'extra terrestres', 'gendarmettes'],
  },
  {
    key: 'percy-jackson', aliases: ['percy jackson'],
    order: ['voleur de foudre', 'mer des monstres'],
  },
  { key: 'scooby-doo', aliases: ['scooby doo'] },
  { key: 'goal', aliases: ['goal'] },
].sort((a, b) => {
  const maxA = Math.max(...a.aliases.map(x => x.length));
  const maxB = Math.max(...b.aliases.map(x => x.length));
  return maxB - maxA; // les alias les plus longs/spécifiques sont testés en premier
});

// Préfixes seuls (articles) qui ne doivent jamais servir de "nom de saga"
// détecté automatiquement (ex: "Les 3 prochains jours", "Les 4 Fantastiques"
// ne sont pas des suites — juste un titre qui commence par un article + chiffre).
const ARTICLE_STOPWORDS = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du']);

function matchesFranchiseAlias(normName, alias) {
  return (` ${normName} `).includes(` ${alias} `);
}

// clé de tri custom pour les sagas dont l'ordre chronologique ne colle pas
// avec un tri alphabétique/numérique classique
const FRANCHISE_ORDER = {};
const FRANCHISE_ALIASES = {};
FRANCHISES.forEach(f => {
  if (f.order) FRANCHISE_ORDER[f.key] = f.order;
  FRANCHISE_ALIASES[f.key] = f.aliases;
});

const LEADING_ARTICLE_RE = /^(le |la |les |l |un |une |des )/;

function franchiseKey(name) {
  const cleaned = (name || '').replace(/\s*\(\d{4}\)\s*/g, ' ').trim();
  const normFull = normalizeKey(cleaned);

  for (const franchise of FRANCHISES) {
    if (franchise.aliases.some(alias => matchesFranchiseAlias(normFull, alias))) {
      return franchise.key;
    }
  }

  // ex: "Harry Potter 3 - et le Prisonnier d'Askaban" -> base "Harry Potter"
  const m = cleaned.match(/^(.*?)[\s:\-–]+\b(\d{1,2}|I{1,3}|IV|VI{0,3}|IX|X)\b/);
  if (m && m[1].trim().length >= 3) {
    const prefixKey = normalizeKey(m[1]);
    if (!ARTICLE_STOPWORDS.has(prefixKey)) {
      return prefixKey;
    }
  }
  // ex: "Le Seigneur des Anneaux - La Communauté de l'anneau" -> base "Le Seigneur des Anneaux"
  const dashIdx = cleaned.indexOf(' - ');
  if (dashIdx > 2) {
    return normalizeKey(cleaned.slice(0, dashIdx));
  }
  return normFull;
}

function relatedSortValue(name, key) {
  const norm = normalizeKey((name || '').replace(/\s*\(\d{4}\)\s*/g, ' ').trim());
  const order = FRANCHISE_ORDER[key];
  if (order) {
    // On teste les fragments du plus spécifique (le plus long) au moins
    // spécifique, pour éviter qu'un fragment générique (ex: le nom de base
    // de la saga) ne "capture" à tort un titre plus précis qui le contient.
    const candidates = order
      .map((fragment, idx) => ({ fragment, idx }))
      .filter(c => norm.includes(c.fragment))
      .sort((a, b) => b.fragment.length - a.fragment.length);
    return candidates.length ? candidates[0].idx : order.length;
  }
  return null; // pas d'ordre custom : on retombe sur le tri alpha/numérique par défaut
}

// Rang par défaut (sans ordre custom) : le film "de base" (celui qui
// correspond exactement à l'alias de la saga, sans numéro) passe en
// premier, puis les films numérotés dans l'ordre de leur numéro, puis les
// éventuels titres sans numéro (souvent des spin-offs) en dernier — triés
// entre eux par ordre alphabétique.
function relatedAutoRank(name, key) {
  const cleaned = (name || '').replace(/\s*\(\d{4}\)\s*/g, ' ').trim();
  const norm = normalizeKey(cleaned);
  const stripped = norm.replace(LEADING_ARTICLE_RE, '');
  const numMatch = norm.match(/(\d{1,3})/);
  if (numMatch) return parseInt(numMatch[1], 10);
  const aliases = FRANCHISE_ALIASES[key] || [key];
  const isBase = aliases.some(a => stripped === a || norm === a);
  return isBase ? 0 : Infinity;
}

function getRelatedMovies(movie) {
  const key = franchiseKey(movie.name);
  if (!key) return [];
  const related = ALL_MOVIES.filter(m => m.id !== movie.id && franchiseKey(m.name) === key);

  const order = FRANCHISE_ORDER[key];
  if (order) {
    return related.sort((a, b) => {
      const va = relatedSortValue(a.name, key);
      const vb = relatedSortValue(b.name, key);
      if (va !== vb) return va - vb;
      return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' });
    });
  }

  return related.sort((a, b) => {
    const ra = relatedAutoRank(a.name, key);
    const rb = relatedAutoRank(b.name, key);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' });
  });
}

function posterPlaceholder(name) {
  return `<span>${escapeHtml(name)}</span>`;
}

function platformBadgesHtml(platforms) {
  return (platforms || []).map(p => `
    <span class="movie-card__badge movie-card__badge--${PLATFORM_CLASS[p] || 'dvd'}">${escapeHtml(PLATFORM_LABELS[p] || p)}</span>
  `).join('');
}

function platformTagsHtml(platforms) {
  return (platforms || []).map(p => `
    <span class="tag tag-${PLATFORM_CLASS[p] || 'dvd'}">${escapeHtml(PLATFORM_LABELS[p] || p)}</span>
  `).join('');
}

function movieCardHtml(m) {
  const poster = m.image_url
    ? `<img src="${escapeHtml(m.image_url)}" alt="Affiche de ${escapeHtml(m.name)}" loading="lazy" onerror="this.parentElement.innerHTML='${posterPlaceholder(m.name).replace(/'/g, "\\'")}'">`
    : posterPlaceholder(m.name);

  return `
    <div class="movie-card" data-id="${m.id}" tabindex="0" role="button" aria-label="Voir la fiche de ${escapeHtml(m.name)}">
      <div class="movie-card__poster">
        ${poster}
        <div class="movie-card__badges">${platformBadgesHtml(m.platforms)}</div>
      </div>
      <div class="movie-card__body">
        <p class="movie-card__title">${escapeHtml(m.name)}</p>
        <p class="movie-card__meta">${escapeHtml(m.type || '')}${m.genre ? ' · ' + escapeHtml(splitGenres(m.genre)[0] || '') : ''}</p>
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
  source.forEach(m => splitGenres(m.genre).forEach(g => genreSet.add(g)));
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

  const genres = splitGenres(m.genre);
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
          ${platformTagsHtml(m.platforms)}
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
