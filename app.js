const API_URL = "https://dattebayo-api.onrender.com/characters";

const entrada = document.getElementById("nombre");
const boton = document.getElementById("buscar");
const mensaje = document.getElementById("mensaje");
const contenedor = document.getElementById("personajes");

boton.addEventListener("click", buscarNinja);

entrada.addEventListener("keydown", function (evento) {
  if (evento.key === "Enter") {
    buscarNinja();
  }
});

async function buscarNinja() {
  const nombre = entrada.value.trim().toLowerCase();

  if (!nombre) {
    mostrarMensaje("Escribe el nombre de un ninja.");
    return;
  }

  contenedor.replaceChildren();
  mostrarMensaje("Buscando información en la API...");

  try {
    // Solicitud HTTP GET a la API de Naruto.
    const url = `${API_URL}?name=${encodeURIComponent(nombre)}&limit=100`;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
      throw new Error("Error HTTP " + respuesta.status);
    }

    // Convertimos la respuesta HTTP a JSON.
    const datos = await respuesta.json();

    // La API devuelve los personajes dentro de characters.
    const lista = datos.characters || [];

    // Filtramos los resultados por nombre.
    const encontrados = lista.filter((personaje) =>
      personaje.name?.toLowerCase().includes(nombre),
    );

    if (encontrados.length === 0) {
      mostrarMensaje("No se encontraron ninjas con ese nombre.");
      return;
    }

    mensaje.textContent = "Ninjas encontrados: " + encontrados.length;

    encontrados.forEach((personaje) => {
      crearTarjeta(personaje);
    });
  } catch (error) {
    console.error("Error al consultar la API:", error);

    mostrarMensaje("No se pudo conectar con la API. Intenta nuevamente.");
  }
}

function crearTarjeta(personaje) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  const imagen = document.createElement("img");

  // Algunas imágenes pueden no estar disponibles.
  const imagenPersonaje = personaje.images?.[0];

  if (imagenPersonaje) {
    imagen.src = imagenPersonaje;
    imagen.alt = personaje.name;
    imagen.loading = "lazy";

    imagen.onerror = function () {
      imagen.style.display = "none";
    };
  } else {
    imagen.style.display = "none";
  }

  const titulo = document.createElement("h2");
  titulo.textContent = personaje.name || "Ninja desconocido";

  const clan = document.createElement("p");
  clan.textContent = "Clan: " + (personaje.personal?.clan || "No disponible");

  const aldea = document.createElement("p");
  aldea.textContent =
    "Aldea: " + (personaje.personal?.affiliation || "No disponible");

  const debut = document.createElement("p");
  debut.className = "dato";
  debut.textContent = "Debut: " + (personaje.debut?.anime || "No disponible");

  tarjeta.append(imagen, titulo, clan, aldea, debut);
  contenedor.appendChild(tarjeta);
}

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
}
