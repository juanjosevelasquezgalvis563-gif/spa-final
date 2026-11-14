import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_ROOT } from "../lib/api";

function urlImagenProducto(image) {
  if (!image) return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${API_ROOT}${image.startsWith("/") ? "" : "/"}${image}`;
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(precio) || 0);
}

export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_ROOT}/inser/cliente/productos`, {
      credentials: "include",
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "No se pudo cargar el catálogo.");
        }
        if (!Array.isArray(data)) {
          throw new Error("El servidor devolvió un catálogo inválido.");
        }
        setProductos(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setMensaje(error.message || "Error al conectar con el servidor.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="catalogo-productos-page">
      <header className="catalogo-productos-header">
        <Link className="catalogo-productos-back" to="/cliente">
          <span aria-hidden="true">←</span> Volver a mi panel
        </Link>
        <span className="catalogo-productos-eyebrow">JC ALTA PELUQUERÍA</span>
        <h1>Productos para cuidar tu esencia</h1>
        <p>Conoce los productos disponibles en nuestro salón.</p>
      </header>

      <section className="catalogo-productos-content" aria-labelledby="catalogo-productos-heading">
        <div className="catalogo-productos-section-heading">
          <div>
            <span>SELECCIÓN DEL SALÓN</span>
            <h2 id="catalogo-productos-heading">Nuestro catálogo</h2>
          </div>
          {!cargando && !mensaje && (
            <p>{productos.length} {productos.length === 1 ? "producto" : "productos"}</p>
          )}
        </div>

        {cargando ? (
          <p className="catalogo-productos-feedback" role="status">Cargando productos...</p>
        ) : mensaje ? (
          <p className="catalogo-productos-feedback error" role="alert">{mensaje}</p>
        ) : productos.length === 0 ? (
          <p className="catalogo-productos-feedback">
            Aún no hay productos disponibles en el catálogo.
          </p>
        ) : (
          <div className="catalogo-productos-grid">
            {productos.map((producto) => (
              <article className="catalogo-producto-card" key={producto.id}>
                <div className="catalogo-producto-image">
                  {producto.image ? (
                    <img
                      src={urlImagenProducto(producto.image)}
                      alt={producto.nombre}
                      loading="lazy"
                    />
                  ) : (
                    <span>JC</span>
                  )}
                  <span className={`catalogo-producto-estado${producto.disponible ? "" : " agotado"}`}>
                    {producto.disponible ? "Disponible" : "Agotado"}
                  </span>
                </div>
                <div className="catalogo-producto-details">
                  <h3>{producto.nombre}</h3>
                  <strong>{formatearPrecio(producto.precio)}</strong>
                  <span className="catalogo-producto-consulta">
                    {producto.disponible ? "Disponible en el salón" : "Agotado"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
