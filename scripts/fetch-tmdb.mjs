// scripts/fetch-tmdb.mjs
//
// Enrichit public/data/movies.json avec des affiches (image_url) et des liens
// de bande-annonce YouTube (trailer_url), en interrogeant l'API gratuite TMDB.
//
// PRÉREQUIS :
//   1. Node.js version 18 ou plus (fetch est natif à partir de Node 18).
//   2. Une clé API TMDB gratuite : https://www.themoviedb.org/settings/api
//      (crée un compte gratuit, "Demander une clé API", type "Developer",
//      c'est instantané).
//
// UTILISATION :
//   TMDB_API_KEY=ta_cle_ici node scripts/fetch-tmdb.mjs
//
// Le script :
//   - lit public/data/movies.json
//   - pour chaque film SANS image_url, cherche sur TMDB (par titre + année si connue)
//   - récupère l'affiche et une bande-annonce YouTube si disponible
//   - écrit le résultat dans public/data/movies.json (une sauvegarde .bak est faite avant)
//   - écrit un rapport des films non trouvés dans scripts/not-found.json,
//     pour que tu puisses les compléter à la main si besoin.
//
// Le script est lent volontairement (pause entre les requêtes) pour respecter
// les limites de l'API gratuite. Pour ~681 films, compte 5 à 10 minutes.

import fs from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('❌ Il manque la variable TMDB_API_KEY.');
  console.error('   Lance le script avec : TMDB_API_KEY=ta_cle_ici node scripts/fetch-tmdb.mjs');
  process.exit(1);
}

const MOVIES_PATH = path.join(process.cwd(), 'public', 'data', 'movies.json');
const NOT_FOUND_PATH = path.join(process.cwd(), 'scripts', 'not-found.json');
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const DELAY_MS = 300; // pause entre chaque film pour ne pas se faire limiter

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tmdbGet(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`TMDB a répondu ${res.status} pour ${url}`);
  }
  return res.json();
}

// Devine s'il faut chercher dans "movie" (film) ou "tv" (série) selon le champ `type`
function guessMediaType(movie) {
  const t = (movie.type || '').toLowerCase();
  if (t.includes('série') || t.includes('serie')) return 'tv';
  return 'movie';
}

async function searchTmdb(name, mediaType) {
  const url = `https://api.themoviedb.org/3/search/${mediaType}?query=${encodeURIComponent(name)}&language=fr-FR&include_adult=false`;
  const data = await tmdbGet(url);
  return (data.results && data.results[0]) || null;
}

async function getTrailerUrl(id, mediaType) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}/videos?language=fr-FR`;
  const data = await tmdbGet(url);
  let vids = data.results || [];

  // Si rien en français, on retente en anglais (beaucoup plus de bandes-annonces dispo)
  if (!vids.length) {
    const dataEn = await tmdbGet(`https://api.themoviedb.org/3/${mediaType}/${id}/videos?language=en-US`);
    vids = dataEn.results || [];
  }

  const trailer =
    vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
    vids.find(v => v.site === 'YouTube');

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

async function main() {
  const raw = await fs.readFile(MOVIES_PATH, 'utf-8');
  const movies = JSON.parse(raw);

  // Sauvegarde de sécurité avant modification
  await fs.writeFile(MOVIES_PATH + '.bak', raw, 'utf-8');

  const notFound = [];
  let done = 0;
  let updated = 0;

  for (const movie of movies) {
    done++;
    if (movie.image_url) {
      continue; // déjà complété, on ne retouche pas
    }

    const mediaType = guessMediaType(movie);
    process.stdout.write(`[${done}/${movies.length}] ${movie.name} (${mediaType})... `);

    try {
      let result = await searchTmdb(movie.name, mediaType);
      // Si rien trouvé côté "movie" et que ce n'était pas déjà un essai "tv", on retente en tv (et inversement)
      if (!result) {
        const fallbackType = mediaType === 'movie' ? 'tv' : 'movie';
        result = await searchTmdb(movie.name, fallbackType);
        if (result) {
          movie.image_url = result.poster_path ? IMG_BASE + result.poster_path : null;
          movie.trailer_url = await getTrailerUrl(result.id, fallbackType);
        }
      } else {
        movie.image_url = result.poster_path ? IMG_BASE + result.poster_path : null;
        movie.trailer_url = await getTrailerUrl(result.id, mediaType);
      }

      if (movie.image_url || movie.trailer_url) {
        updated++;
        console.log('✅');
      } else {
        notFound.push({ id: movie.id, name: movie.name });
        console.log('⚠️  trouvé mais sans affiche/bande-annonce');
      }
    } catch (e) {
      notFound.push({ id: movie.id, name: movie.name, error: e.message });
      console.log('❌ ' + e.message);
    }

    await sleep(DELAY_MS);
  }

  await fs.writeFile(MOVIES_PATH, JSON.stringify(movies, null, 2), 'utf-8');
  await fs.mkdir(path.dirname(NOT_FOUND_PATH), { recursive: true });
  await fs.writeFile(NOT_FOUND_PATH, JSON.stringify(notFound, null, 2), 'utf-8');

  console.log('\n----------------------------------------');
  console.log(`Terminé. ${updated} film(s) complété(s).`);
  console.log(`${notFound.length} film(s) non trouvé(s) — voir scripts/not-found.json`);
  console.log('Une sauvegarde de l\'ancien fichier a été faite : public/data/movies.json.bak');
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
