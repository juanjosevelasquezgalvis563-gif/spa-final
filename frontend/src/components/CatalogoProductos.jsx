import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_ROOT } from "../lib/api";

const CLAVE_CARRITO = "jc-catalogo-carrito-v1";

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
  const [carrito, setCarrito] = useState([]);
  const [carritoListo, setCarritoListo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [mensajeCarrito, setMensajeCarrito] = useState("");
  const [mensajePago, setMensajePago] = useState("");
  const [esErrorPago, setEsErrorPago] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [iniciandoPago, setIniciandoPago] = useState(false);
  const [solicitandoCompra, setSolicitandoCompra] = useState(false);
  const location = useLocation();
  const transactionId = useMemo(
    () => new URLSearchParams(location.search).get("id"),
    [location.search]
  );
  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [Number(producto.id), producto])),
    [productos]
  );
  const totalCarrito = carrito.reduce((total, item) => {
    const producto = productosPorId.get(item.producto_id);
    return total + (producto ? Number(producto.precio) * item.cantidad : 0);
  }, 0);
  const cantidadArticulos = carrito.reduce((cantidad, item) => cantidad + item.cantidad, 0);
  const carritoTieneProductosNoDisponibles = carrito.some(
    (item) => !productosPorId.has(item.producto_id)
      || !productosPorId.get(item.producto_id)?.disponible
  );

  const mostrarEstadoPago = useCallback((data) => {
    setEsErrorPago(false);
    if (data.estado === "APPROVED" && !data.requiereAtencion) {
      setCarrito([]);
      setMensajePago("¡Pago aprobado! Tu compra quedó registrada correctamente.");
    } else if (data.requiereAtencion) {
      setMensajePago("Wompi aprobó el pago, pero la reserva venció. Comunícate con el salón para confirmar tu pedido.");
    } else if (data.estado === "PENDING") {
      setMensajePago("El pago sigue pendiente. Puedes volver a verificarlo en unos momentos.");
    } else {
      setMensajePago(`El pago no se completó (${data.estado.toLowerCase()}). Puedes revisar tu carrito e intentarlo de nuevo.`);
    }
  }, []);

  const verificarPago = useCallback(async (id) => {
    setVerificandoPago(true);
    setMensajePago("");
    try {
      const response = await fetch(
        `${API_ROOT}/inser/cliente/pedidos/wompi/${encodeURIComponent(id)}`,
        { credentials: "include" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo verificar el pago.");
      }
      mostrarEstadoPago(data);
    } catch (error) {
      setEsErrorPago(true);
      setMensajePago(error.message || "No se pudo verificar el pago.");
    } finally {
      setVerificandoPago(false);
    }
  }, [mostrarEstadoPago]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      try {
        const guardado = window.localStorage.getItem(CLAVE_CARRITO);
        const datos = guardado ? JSON.parse(guardado) : [];
        if (!Array.isArray(datos)) throw new Error("El carrito guardado tiene un formato inválido.");
        setCarrito(datos.filter((item) =>
          Number.isInteger(item?.producto_id)
          && Number.isInteger(item?.cantidad)
          && item.cantidad > 0
          && item.cantidad <= 20
        ));
      } catch (error) {
        setMensajeCarrito(error.message || "No se pudo recuperar el carrito de este navegador.");
      } finally {
        setCarritoListo(true);
      }
    });

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

  useEffect(() => {
    if (!carritoListo) return;
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (error) {
      Promise.resolve().then(() => {
        setMensajeCarrito(error.message || "No se pudo guardar el carrito en este navegador.");
      });
    }
  }, [carrito, carritoListo]);

  useEffect(() => {
    if (transactionId) {
      void Promise.resolve().then(() => verificarPago(transactionId));
    }
  }, [transactionId, verificarPago]);

  function agregarAlCarrito(producto) {
    setMensajePago("");
    const existente = carrito.find((item) => item.producto_id === Number(producto.id));
    if (existente?.cantidad >= 20) {
      setMensajePago("Puedes agregar hasta 20 unidades de cada producto por pedido.");
      return;
    }

    setCarrito((actual) => {
      if (existente) {
        return actual.map((item) => item.producto_id === Number(producto.id)
          ? { ...item, cantidad: item.cantidad + 1 }
          : item);
      }
      return [...actual, { producto_id: Number(producto.id), cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId, cambio) {
    setCarrito((actual) => actual
      .map((item) => item.producto_id === productoId
        ? { ...item, cantidad: item.cantidad + cambio }
        : item)
      .filter((item) => item.cantidad > 0 && item.cantidad <= 20));
  }

  function quitarDelCarrito(productoId) {
    setCarrito((actual) => actual.filter((item) => item.producto_id !== productoId));
  }

  async function iniciarPago() {
    const items = carrito.map(({ producto_id, cantidad }) => ({ producto_id, cantidad }));
    if (!items.length) return;

    setIniciandoPago(true);
    setMensajePago("");
    setEsErrorPago(false);
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/pedidos/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo iniciar el pago.");
      }

      const checkout = new URL(data.checkoutUrl);
      if (checkout.origin !== "https://checkout.wompi.co") {
        throw new Error("El servidor devolvió un enlace de pago no válido.");
      }
      window.location.assign(checkout.href);
    } catch (error) {
      setEsErrorPago(true);
      setMensajePago(error.message || "No se pudo iniciar el pago.");
      setIniciandoPago(false);
    }
  }

  async function solicitarCompra() {
    const items = carrito.map(({ producto_id, cantidad }) => ({ producto_id, cantidad }));
    if (!items.length) return;

    setSolicitandoCompra(true);
    setMensajePago("");
    setEsErrorPago(false);
    try {
      const response = await fetch(`${API_ROOT}/inser/cliente/pedidos/solicitar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo enviar la solicitud.");
      }

      setCarrito([]);
      setMensajePago(`${data.message} Referencia: ${data.pedido}`);
    } catch (error) {
      setEsErrorPago(true);
      setMensajePago(error.message || "No se pudo enviar la solicitud.");
    } finally {
      setSolicitandoCompra(false);
    }
  }

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

        {mensajePago && (
          <div
            className={`catalogo-productos-payment-message${esErrorPago ? " error" : ""}`}
            role={esErrorPago ? "alert" : "status"}
          >
            <p>{mensajePago}</p>
            {transactionId && (
              <button
                type="button"
                onClick={() => verificarPago(transactionId)}
                disabled={verificandoPago}
              >
                {verificandoPago ? "Verificando..." : "Verificar pago"}
              </button>
            )}
          </div>
        )}

        {mensajeCarrito && (
          <p className="catalogo-productos-feedback error" role="alert">
            {mensajeCarrito}
          </p>
        )}

        <section className="catalogo-carrito" aria-labelledby="catalogo-carrito-heading">
          <div className="catalogo-carrito-heading">
            <div>
              <span>SELECCIÓN PERSONAL</span>
              <h2 id="catalogo-carrito-heading">Tu carrito</h2>
            </div>
            <span className="catalogo-carrito-count">
              {cantidadArticulos} {cantidadArticulos === 1 ? "artículo" : "artículos"}
            </span>
          </div>
          {carrito.length === 0 ? (
            <p className="catalogo-carrito-empty">Aún no agregas productos a tu carrito.</p>
          ) : (
            <>
              <div className="catalogo-carrito-items">
                {carrito.map((item) => {
                  const producto = productosPorId.get(item.producto_id);
                  return (
                    <div className="catalogo-carrito-item" key={item.producto_id}>
                      {producto?.image ? (
                        <img src={urlImagenProducto(producto.image)} alt="" />
                      ) : (
                        <span className="catalogo-carrito-placeholder">JC</span>
                      )}
                      <div className="catalogo-carrito-product-info">
                        <strong>{producto?.nombre || "Producto no disponible"}</strong>
                        <span>{producto ? formatearPrecio(producto.precio) : "Retíralo para continuar"}</span>
                      </div>
                      <div className="catalogo-carrito-quantity" aria-label="Cantidad">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto_id, -1)}
                          aria-label={`Quitar una unidad de ${producto?.nombre || "producto"}`}
                        >−</button>
                        <span>{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto_id, 1)}
                          disabled={item.cantidad >= 20}
                          aria-label={`Agregar una unidad de ${producto?.nombre || "producto"}`}
                        >+</button>
                      </div>
                      <button
                        className="catalogo-carrito-remove"
                        type="button"
                        onClick={() => quitarDelCarrito(item.producto_id)}
                        aria-label={`Quitar ${producto?.nombre || "producto"} del carrito`}
                      >Quitar</button>
                    </div>
                  );
                })}
              </div>
              <div className="catalogo-carrito-total">
                <span>Total</span>
                <strong>{formatearPrecio(totalCarrito)}</strong>
              </div>
              <div className="catalogo-carrito-actions">
                <button
                  className="catalogo-carrito-request"
                  type="button"
                  onClick={solicitarCompra}
                  disabled={solicitandoCompra || iniciandoPago || !carritoListo || cargando
                    || carritoTieneProductosNoDisponibles}
                >
                  {solicitandoCompra ? "Enviando solicitud..." : "Solicitar al salón"}
                </button>
                <button
                  className="catalogo-carrito-checkout"
                  type="button"
                  onClick={iniciarPago}
                  disabled={iniciandoPago || solicitandoCompra || !carritoListo || cargando
                    || carritoTieneProductosNoDisponibles}
                >
                  {iniciandoPago ? "Preparando pago..." : "Pagar con Wompi"}
                  {!iniciandoPago && <span aria-hidden="true">→</span>}
                </button>
              </div>
              {carritoTieneProductosNoDisponibles && (
                <p className="catalogo-carrito-unavailable" role="alert">
                  Hay productos agotados o que ya no están disponibles en tu carrito.
                  Retíralos para continuar.
                </p>
              )}
              <p className="catalogo-carrito-note">
                Puedes enviar la solicitud para confirmarla con el salón o pagar en línea.
                Wompi mostrará los medios habilitados en la cuenta.
              </p>
            </>
          )}
        </section>

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
                  <button
                    className="catalogo-producto-add"
                    type="button"
                    onClick={() => agregarAlCarrito(producto)}
                    disabled={!producto.disponible || !carritoListo}
                  >
                    {producto.disponible ? "Agregar al carrito" : "Agotado"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
