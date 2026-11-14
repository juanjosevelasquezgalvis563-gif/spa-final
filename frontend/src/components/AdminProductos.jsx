import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);
  const formularioRef = useRef(null);
  const navigate = useNavigate();

  const vistaPrevia = useMemo(
    () => imagen ? URL.createObjectURL(imagen) : "",
    [imagen]
  );

  useEffect(() => () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
  }, [vistaPrevia]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_ROOT}/inser/administrador/productos`, {
      credentials: "include",
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "No se pudieron cargar los productos.");
        }
        if (!Array.isArray(data)) {
          throw new Error("El servidor devolvió una lista de productos inválida.");
        }
        setProductos(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setMensaje(error.message || "Error al conectar con el servidor.");
          setEsError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, []);

  function seleccionarImagen(event) {
    const archivo = event.target.files?.[0] || null;
    setMensaje("");

    if (!archivo) {
      setImagen(null);
      return;
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase();
    const formatosPermitidos = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];
    const extensionesPermitidas = ["jpg", "jpeg", "png", "webp"];
    if (!formatosPermitidos.includes(archivo.type.toLowerCase())
      && !extensionesPermitidas.includes(extension)) {
      setImagen(null);
      event.target.value = "";
      setMensaje("Elige una imagen JPG, PNG o WEBP.");
      setEsError(true);
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setImagen(null);
      event.target.value = "";
      setMensaje("La imagen debe pesar 5 MB o menos.");
      setEsError(true);
      return;
    }

    setImagen(archivo);
  }

  async function agregarProducto(event) {
    event.preventDefault();
    if (!imagen) {
      setMensaje("Selecciona una imagen del producto para continuar.");
      setEsError(true);
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`${API_ROOT}/inser/administrador/productos`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "No se pudo agregar el producto.");
      }

      setProductos((actuales) => [data.producto, ...actuales]);
      formularioRef.current?.reset();
      setImagen(null);
      setMensaje(data.message || "Producto agregado correctamente.");
      setEsError(false);
    } catch (error) {
      setMensaje(error.message || "Error al conectar con el servidor.");
      setEsError(true);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="admin-productos-page">
      <header className="admin-productos-header">
        <div>
          <span className="admin-productos-kicker">TIENDA JC ALTA PELUQUERÍA</span>
          <h1>Administrar productos</h1>
          <p>Agrega los productos que ofreces y mantén actualizado el inventario.</p>
        </div>
        <Link className="admin-productos-back" to="/admin">
          Volver al panel
        </Link>
      </header>

      <div className="admin-productos-layout">
        <section className="admin-productos-form-card">
          <div className="admin-productos-section-heading">
            <span>01</span>
            <div>
              <h2>Agregar producto</h2>
              <p>Completa la información y carga una imagen.</p>
            </div>
          </div>

          <form
            ref={formularioRef}
            className="admin-productos-form"
            onSubmit={agregarProducto}
          >
            <label>
              <span>Nombre del producto</span>
              <input name="nombre" type="text" maxLength="120" required />
            </label>

            <div className="admin-productos-numericos">
              <label>
                <span>Precio (COP)</span>
                <input name="precio" type="number" min="0" step="1" required />
              </label>
              <label>
                <span>Unidades disponibles</span>
                <input name="stock" type="number" min="0" step="1" required />
              </label>
            </div>

            <label className="admin-productos-file">
              <span>Imagen del producto</span>
              <input
                name="image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={seleccionarImagen}
                required
              />
              <small>JPG, PNG o WEBP. Máximo 5 MB.</small>
            </label>

            {vistaPrevia && (
              <div className="admin-productos-preview">
                <img src={vistaPrevia} alt="Vista previa del producto" />
                <span>Vista previa</span>
              </div>
            )}

            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando producto..." : "Agregar al catálogo"}
            </button>

            {mensaje && (
              <p className={`admin-productos-message${esError ? " error" : ""}`} role={esError ? "alert" : "status"}>
                {mensaje}
              </p>
            )}
          </form>
        </section>

        <section className="admin-productos-list-section">
          <div className="admin-productos-section-heading">
            <span>02</span>
            <div>
              <h2>Productos registrados</h2>
              <p>{productos.length} {productos.length === 1 ? "producto" : "productos"} en el catálogo</p>
            </div>
          </div>

          {cargando ? (
            <p className="admin-productos-empty" role="status">Cargando productos...</p>
          ) : productos.length === 0 ? (
            <p className="admin-productos-empty">Aún no hay productos. Agrega el primero desde el formulario.</p>
          ) : (
            <div className="admin-productos-grid">
              {productos.map((producto) => (
                <article className="admin-producto-card" key={producto.id}>
                  <img
                    src={urlImagenProducto(producto.image)}
                    alt={producto.nombre}
                    loading="lazy"
                  />
                  <div className="admin-producto-info">
                    <h3>{producto.nombre}</h3>
                    <strong>{formatearPrecio(producto.precio)}</strong>
                    <span>{producto.stock} unidades · {producto.estado}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/actualizarProducto/${producto.id}`)}
                    aria-label={`Editar ${producto.nombre}`}
                  >
                    Editar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

    </main>
  );
}
