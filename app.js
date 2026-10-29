
const API_URL = "https://api.tenrai.org/v1";

const formulario = document.getElementById("formulario-busqueda");
const entrada = document.getElementById("nombre");
const botonBuscar = document.getElementById("buscar");
const botonMas = document.getElementById("cargar-mas");
const mensaje = document.getElementById("mensaje");
const contenedor = document.getElementById("personajes");
const titulo = document.getElementById("titulo-resultados");
const contador = document.getElementById("contador");

let consultaActual = "";
let paginaActual = 0;
let hayMasResultados = false;
let buscando = false;
let resultadosTotales = 0;
let generacion = 0;

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = entrada.value.trim();

    if (!nombre) {
        mostrarMensaje("Escribe el nombre de un personaje.");
        entrada.focus();
        return;
    }

    consultaActual = nombre;
    paginaActual = 0;
    hayMasResultados = false;
    resultadosTotales = 0;
    generacion++;

    contenedor.replaceChildren();
    contador.textContent = "";
    botonMas.hidden = true;
    titulo.textContent = `Resultados para "${nombre}"`;

    await buscarPersonajes(false, generacion);
});

botonMas.addEventListener("click", async () => {
    if (buscando || !hayMasResultados) return;

    await buscarPersonajes(true, generacion);
});

async function buscarPersonajes(anexar, idBusqueda) {
    if (buscando) return;

    buscando = true;
    botonBuscar.disabled = true;
    botonMas.disabled = true;

    if (!anexar) {
        mostrarMensaje("Buscando personajes...");
    } else {
        botonMas.textContent = "Cargando...";
    }

    try {
        const paginaSolicitada = anexar ? paginaActual + 1 : 1;

        const url = new URL(`${API_URL}/characters`);
        url.searchParams.set("q", consultaActual);
        url.searchParams.set("page", paginaSolicitada);
        url.searchParams.set("limit", "25");

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            if (respuesta.status === 429) {
                throw new Error(
                    "La API recibió demasiadas consultas. Espera unos segundos."
                );
            }

            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const resultado = await respuesta.json();

        // Ignoramos respuestas de una búsqueda anterior.
        if (idBusqueda !== generacion) return;

        const personajes = Array.isArray(resultado.data)
            ? resultado.data
            : [];

        if (!anexar) {
            contenedor.replaceChildren();
        }

        if (personajes.length === 0 && !anexar) {
            mostrarMensaje(
                "No encontramos personajes con ese nombre. Prueba otra búsqueda."
            );
            contador.textContent = "";
            botonMas.hidden = true;
            return;
        }

        personajes.forEach(crearTarjeta);

        paginaActual = paginaSolicitada;
        resultadosTotales += personajes.length;

        hayMasResultados = Boolean(
            resultado.pagination?.has_next_page
        );

        mensaje.textContent = hayMasResultados
            ? "Hay más coincidencias. Puedes cargar la siguiente página."
            : "Has llegado al final de los resultados disponibles.";

        contador.textContent = `${resultadosTotales} cargados`;
        botonMas.hidden = !hayMasResultados;

    } catch (error) {
        if (idBusqueda !== generacion) return;

        console.error("Error consultando Jikan:", error);

        if (anexar) {
            mostrarMensaje(
                "No se pudo cargar la siguiente página. Intenta nuevamente."
            );
        } else {
            mostrarMensaje(
                error.message ||
                "No se pudo conectar con la API. Comprueba tu conexión."
            );
            mensaje.classList.add("error");
        }
    } finally {
        if (idBusqueda === generacion) {
            buscando = false;
            botonBuscar.disabled = false;
            botonMas.disabled = false;
            botonMas.textContent = "Cargar más resultados";
        }
    }
}

function crearTarjeta(personaje) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    const imagen = document.createElement("img");
    imagen.className = "imagen-personaje";
    imagen.alt = `Imagen de ${personaje.name || "personaje"}`;
    imagen.loading = "lazy";

    const imagenUrl = personaje.images?.jpg?.image_url;

    if (imagenUrl) {
        imagen.src = imagenUrl;
        imagen.onerror = () => {
            imagen.removeAttribute("src");
            imagen.alt = "Imagen no disponible";
        };
    } else {
        imagen.alt = "Este personaje no tiene imagen disponible";
    }

    const contenido = document.createElement("div");
    contenido.className = "tarjeta-contenido";

    const nombre = document.createElement("h3");
    nombre.textContent = personaje.name || "Nombre no disponible";

    const descripcion = document.createElement("p");
    descripcion.className = "descripcion";

    const textoDescripcion = limpiarDescripcion(personaje.about);

    descripcion.textContent = textoDescripcion ||
        "La fuente no proporciona una descripción para este personaje.";

    const debut = document.createElement("p");
    debut.className = "ficha-dato";

    const etiquetaDebut = document.createElement("strong");
    etiquetaDebut.textContent = "Episodio de debut: ";

    // Jikan no garantiza un episodio de debut para cada personaje.
    debut.append(
        etiquetaDebut,
        document.createTextNode("No disponible en la API.")
    );

    const botonAnimes = document.createElement("button");
    botonAnimes.className = "boton-animes";
    botonAnimes.type = "button";
    botonAnimes.textContent = "Ver animes relacionados";

    const listaAnimes = document.createElement("div");
    listaAnimes.className = "lista-animes";
    listaAnimes.hidden = true;

    botonAnimes.addEventListener("click", async () => {
        if (!listaAnimes.hidden) {
            listaAnimes.hidden = true;
            botonAnimes.textContent = "Ver animes relacionados";
            return;
        }

        if (listaAnimes.dataset.cargado === "true") {
            listaAnimes.hidden = false;
            botonAnimes.textContent = "Ocultar animes";
            return;
        }

        const id = personaje.mal_id;

        if (!id) {
            listaAnimes.textContent =
                "No tenemos un identificador para consultar sus animes.";
            listaAnimes.hidden = false;
            return;
        }

        botonAnimes.disabled = true;
        botonAnimes.textContent = "Consultando...";
        listaAnimes.replaceChildren();

        try {
            const respuesta = await fetch(
                `${API_URL}/characters/${id}/anime`
            );

            if (!respuesta.ok) {
                throw new Error(`Error HTTP ${respuesta.status}`);
            }

            const resultado = await respuesta.json();
            const apariciones = Array.isArray(resultado.data)
                ? resultado.data
                : [];

            if (apariciones.length === 0) {
                listaAnimes.textContent =
                    "No hay animes relacionados registrados en la fuente.";
            } else {
                const encabezado = document.createElement("p");
                encabezado.textContent = "Animes relacionados:";
                listaAnimes.appendChild(encabezado);

                const lista = document.createElement("ul");

                apariciones.forEach(aparicion => {
                    const elemento = document.createElement("li");
                    const anime = aparicion.anime;

                    if (anime?.url) {
                        const enlace = document.createElement("a");
                        enlace.href = anime.url;
                        enlace.target = "_blank";
                        enlace.rel = "noopener noreferrer";
                        enlace.textContent =
                            anime.title || "Anime sin título";
                        elemento.appendChild(enlace);
                    } else {
                        elemento.textContent =
                            anime?.title || "Título no disponible";
                    }

                    const rol = aparicion.role;
                    if (rol) {
                        elemento.appendChild(
                            document.createTextNode(` — ${rol}`)
                        );
                    }

                    lista.appendChild(elemento);
                });

                listaAnimes.appendChild(lista);
            }

            listaAnimes.dataset.cargado = "true";
            listaAnimes.hidden = false;
            botonAnimes.textContent = "Ocultar animes";

        } catch (error) {
            console.error("Error consultando animes:", error);
            listaAnimes.textContent =
                "No se pudieron cargar los animes. Intenta de nuevo.";
            listaAnimes.hidden = false;
        } finally {
            botonAnimes.disabled = false;
            if (listaAnimes.dataset.cargado !== "true") {
                botonAnimes.textContent = "Ver animes relacionados";
            }
        }
    });

    contenido.append(nombre, descripcion, debut, botonAnimes, listaAnimes);
    tarjeta.append(imagen, contenido);
    contenedor.appendChild(tarjeta);
}

function limpiarDescripcion(texto) {
    if (!texto) return "";

    // Conservamos el texto original sin etiquetas HTML.
    return texto
        .replace(/\[Written by MAL Rewrite\]/gi, "")
        .trim();
}

function mostrarMensaje(texto) {
    mensaje.classList.remove("error");
    mensaje.textContent = texto;
}
