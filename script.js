const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const detalleAnimeDiv = document.getElementById('detalleAnime');
const infoCompletaDiv = document.getElementById('infoCompleta');
const personajesDiv = document.getElementById('personajes');
const cerrarDetalleBtn = document.getElementById('cerrarDetalle');
const episodiosDiv = document.getElementById('episodios');
// NUEVO: contenedor para videos de episodios
const episodiosVideosDiv = document.getElementById('episodiosVideos');

buscarBtn.addEventListener('click', () => {
  const nombre = document.getElementById('animeName').value.trim();
  resultadoDiv.innerHTML = '';
  infoCompletaDiv.innerHTML = '';
  personajesDiv.innerHTML = '';
  episodiosDiv.innerHTML = '';
  if (episodiosVideosDiv) episodiosVideosDiv.innerHTML = ''; // NUEVO
  detalleAnimeDiv.style.display = 'none';
  resultadoDiv.style.display = 'flex';
  resultadoDiv.style.flexWrap = 'wrap';

  if (!nombre) {
    resultadoDiv.innerHTML = `<p class="error">Por favor ingresa un nombre de anime.</p>`;
    return;
  }

  fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(nombre)}&limit=10`)
    .then(response => {
      if (!response.ok) throw new Error('Error en la búsqueda');
      return response.json();
    })
    .then(data => {
      if (data.data.length === 0) {
        resultadoDiv.innerHTML = `<p class="error">No se encontraron animes con ese nombre.</p>`;
        return;
      }
      // Mostrar resultados con imagen y título, clickeables
      resultadoDiv.innerHTML = data.data.map(anime => `
        <div data-id="${anime.mal_id}" tabindex="0" role="button" aria-pressed="false" style="cursor:pointer; margin-bottom: 1.5rem; text-align:center; max-width: 220px;">
          <h3>${anime.title}</h3>
          <img src="${anime.images.jpg.image_url}" alt="Imagen de ${anime.title}" style="max-width: 200px; border-radius: 10px; box-shadow: 0 0 10px #00aaffaa;" />
        </div>
      `).join('');

      // Añadir eventos click y teclado a cada resultado
      Array.from(resultadoDiv.children).forEach(div => {
        div.addEventListener('click', () => {
          cargarDetalles(div.getAttribute('data-id'));
        });
        div.addEventListener('keypress', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            cargarDetalles(div.getAttribute('data-id'));
          }
        });
      });
    })
    .catch(err => {
      resultadoDiv.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    });
});

cerrarDetalleBtn.addEventListener('click', () => {
  detalleAnimeDiv.style.display = 'none';
  resultadoDiv.style.display = 'flex';
  resultadoDiv.style.flexWrap = 'wrap';
});

// Función para cargar detalles completos, personajes y episodios (+ videos de episodios)
function cargarDetalles(id) {
  resultadoDiv.style.display = 'none';
  detalleAnimeDiv.style.display = 'block';
  infoCompletaDiv.innerHTML = 'Cargando detalles...';
  personajesDiv.innerHTML = '';
  episodiosDiv.innerHTML = '';
  if (episodiosVideosDiv) episodiosVideosDiv.innerHTML = ''; // NUEVO

  // Fetch detalles completos
  fetch(`https://api.jikan.moe/v4/anime/${id}/full`)
    .then(resp => {
      if (!resp.ok) throw new Error('No se pudo cargar el detalle del anime');
      return resp.json();
    })
    .then(data => {
      const anime = data.data;
      const sinopsis = anime.synopsis ? anime.synopsis : 'Sin sinopsis disponible.';
      const score = anime.score ? anime.score : 'N/A';
      const year = anime.year ? anime.year : 'N/A';
      infoCompletaDiv.innerHTML = `
        <img src="${anime.images.jpg.image_url}" alt="Imagen de ${anime.title}" />
        <h2>${anime.title}</h2>
        <p><strong>Año:</strong> ${year}</p>
        <p><strong>Score:</strong> ${score}</p>
        <p><strong>Sinopsis:</strong> ${sinopsis}</p>
      `;
    })
    .catch(err => {
      infoCompletaDiv.innerHTML = `<p class="error">${err.message}</p>`;
    });

  // Fetch personajes
  fetch(`https://api.jikan.moe/v4/anime/${id}/characters`)
    .then(resp => {
      if (!resp.ok) throw new Error('No se pudieron cargar los personajes');
      return resp.json();
    })
    .then(data => {
      if (!data.data || data.data.length === 0) {
        personajesDiv.innerHTML = '<p>No hay personajes disponibles.</p>';
        return;
      }

      personajesDiv.innerHTML = data.data.map(p => `
        <div class="personaje" title="${p.character.name}">
          <img src="${p.character.images.jpg.image_url}" alt="${p.character.name}" />
          <p>${p.character.name}</p>
        </div>
      `).join('');
    })
    .catch(err => {
      personajesDiv.innerHTML = `<p class="error">${err.message}</p>`;
    });

  // Fetch episodios (lista textual)
  fetch(`https://api.jikan.moe/v4/anime/${id}/episodes`)
    .then(resp => {
      if (!resp.ok) throw new Error('No se pudieron cargar los episodios');
      return resp.json();
    })
    .then(data => {
      if (!data.data || data.data.length === 0) {
        episodiosDiv.innerHTML = '<p>No hay episodios disponibles.</p>';
        return;
      }

      // Mostrar los primeros 13 episodios para no saturar
      const primerosEpisodios = data.data.slice(0, 13);
      episodiosDiv.innerHTML = primerosEpisodios.map(ep => `
        <p><strong>Episodio ${ep.mal_id}:</strong> ${ep.title || 'Sin título'}</p>
      `).join('');
    })
    .catch(err => {
      episodiosDiv.innerHTML = `<p class="error">${err.message}</p>`;
    });

  // NUEVO: Fetch videos por episodio (miniaturas + enlaces)
  if (episodiosVideosDiv) {
    fetch(`https://api.jikan.moe/v4/anime/${id}/videos/episodes`)
      .then(resp => {
        if (!resp.ok) throw new Error('No se pudieron cargar los videos de episodios');
        return resp.json();
      })
      .then(data => {
        if (!data.data || data.data.length === 0) {
          episodiosVideosDiv.innerHTML = '<p>No hay videos de episodios disponibles.</p>';
          return;
        }

        // Muestra hasta 12 para no saturar la UI
        const lista = data.data.slice(0, 12).map(item => {
          // Campos defensivos (varían según el anime)
          const epNum = item.episode ?? item.mal_id ?? '';
          const title = item.title || `Episodio ${epNum}`;
          const thumb =
            item.images?.jpg?.image_url ||
            item.images?.image_url ||
            item.thumbnail ||
            '';
          const videoUrl =
            item.url ||
            item.video?.url ||
            (Array.isArray(item.videos) ? item.videos[0]?.url : undefined) ||
            '#';

          return `
            <article class="episodio-video-card">
              ${thumb ? `<a href="${videoUrl}" target="_blank" rel="noopener">
                  <img class="episodio-video-thumb" src="${thumb}" alt="Thumb episodio ${epNum}">
                </a>` : ''}
              <div class="episodio-video-title">${title}</div>
              <div class="episodio-video-meta">Episodio ${epNum || 'N/D'}</div>
              <a href="${videoUrl}" target="_blank" rel="noopener">Ver video</a>
            </article>
          `;
        }).join('');

        episodiosVideosDiv.innerHTML = lista;
      })
      .catch(err => {
        episodiosVideosDiv.innerHTML = `<p class="error">${err.message}</p>`;
      });
  }
}
