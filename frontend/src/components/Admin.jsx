import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { CalendarDays, Package, ReceiptText, ShoppingBag } from 'lucide-react';
import { API_ROOT } from '../lib/api';
import RegistrarPago from './RegistrarPago';
import ReportesAdmin from './ReportesAdmin';
import HistorialPagos from './HistorialPagos';
import { useSession } from '../context/useSession';

function urlImagenProducto(image) {
    if (!image) return "";
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    return `${API_ROOT}${image.startsWith("/") ? "" : "/"}${image}`;
}

export function Admin() {

    const [admin, SetAdmin] = useState(null);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(true);
    const [productos, SetProductos] = useState([]);
    const [historial, SetHistorial] = useState([]);
    const [cantidadesDescontar, SetCantidadesDescontar] = useState({});
    const [historialVisible, SetHistorialVisible] = useState(false);
    const [historialCargado, SetHistorialCargado] = useState(false);
    const [cargandoHistorial, SetCargandoHistorial] = useState(false);
    const [message, SetMessage] = useState('');

    const [productoId, SetProductoId] = useState("");
    const [fecha, SetFecha] = useState("");
    const [cantidad, SetCantidad] = useState("");
    const [precio_compra, SetPrecioCompra] = useState("");
    const [rolPerfil, SetRolPerfil] = useState('empleado');
    const [perfiles, SetPerfiles] = useState([]);
    const [cargandoPerfiles, SetCargandoPerfiles] = useState(false);
    const [productoDescontando, SetProductoDescontando] = useState(null);

    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const { logout } = useSession();
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const productoCompraSeleccionado = productos.find((producto) => String(producto.id) === productoId);
    const totalCompraEstimado = (Number(cantidad) || 0) * (Number(precio_compra) || 0);

    const formatoMoneda = (valor) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);

    async function cerrarSesion() {
        if (cerrandoSesion) return;
        setCerrandoSesion(true);
        try {
            await logout();
            navigate('/');
        } catch (error) {
            SetMessage('No pudimos cerrar tu sesión. Inténtalo de nuevo.');
        } finally {
            setCerrandoSesion(false);
        }
    }

    async function obtenerAdmin() {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetAdmin(data);
            } else {
                navigate('/login');
            }

        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    async function obtenerProductos() {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/productos`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetProductos(data);
            }else{
                SetMessage(data.message);
            }

        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    async function eliminarProducto(id) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/productos/${id}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);
                obtenerProductos();
            }else{
                SetMessage(data.message);
            }

        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    async function descontarStock(producto) {
        const cantidad = Number(cantidadesDescontar[producto.id]);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
            SetMessage('Ingresa una cantidad entera mayor que cero para descontar.');
            return;
        }

        SetProductoDescontando(producto.id);
        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/productos/${producto.id}/descontar-stock`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                SetMessage(data.message || 'No se pudo descontar el stock.');
                return;
            }

            SetProductos((actuales) => actuales.map((item) =>
                item.id === producto.id ? { ...item, ...data.producto } : item
            ));
            SetCantidadesDescontar((actuales) => ({ ...actuales, [producto.id]: '' }));
            SetMessage(data.message);
        } catch {
            SetMessage('No pudimos actualizar las existencias. Inténtalo de nuevo.');
        } finally {
            SetProductoDescontando(null);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/compras`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        producto_id: Number(productoId),
                        fecha,
                        cantidad: Number(cantidad),
                        precio_compra: Number(precio_compra)
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                SetMessage(data.message);

                SetProductoId("");
                SetFecha("");
                SetCantidad("");
                SetPrecioCompra("");

                obtenerProductos();
            } else {
                SetMessage(data.message);
            }

        } catch {
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    async function historialCompras(){
        SetCargandoHistorial(true);
        try{
            const response = await fetch(`${API_ROOT}/inser/administrador/historialCompras`,{
                method:'GET',
                credentials:'include'
            });
            const data = await response.json();
            if(response.ok){
                SetHistorial(data);
                SetHistorialCargado(true);
            }else{
                SetMessage(data.message);
            }
        }catch{
            SetMessage('No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            SetCargandoHistorial(false);
        }
    }

    async function alternarHistorial() {
        const mostrar = !historialVisible;
        SetHistorialVisible(mostrar);
        if (mostrar && !historialCargado) await historialCompras();
    }

    async function obtenerPerfiles(rol = rolPerfil) {
        SetCargandoPerfiles(true);
        SetPerfiles([]);

        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/perfiles?rol=${rol}`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (response.ok) {
                SetPerfiles(data);
            } else {
                SetMessage(data.message || 'No se pudieron cargar los perfiles.');
            }
        } catch {
            SetMessage('No pudimos cargar los perfiles. Inténtalo de nuevo.');
        } finally {
            SetCargandoPerfiles(false);
        }
    }

    async function abrirPerfil(usuario) {
        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/perfil-activo`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: usuario.id, rol: rolPerfil })
                }
            );
            const data = await response.json();

            if (response.ok) {
                navigate(`/${rolPerfil}?perfilId=${usuario.id}`);
            } else {
                SetMessage(data.message || 'No se pudo abrir el perfil.');
            }
        } catch {
            SetMessage('No pudimos abrir el perfil. Inténtalo de nuevo.');
        }
    }

    async function limpiarPerfilActivo() {
        await fetch(`${API_ROOT}/inser/administrador/perfil-activo`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    }

    useEffect(() => {
        void Promise.resolve().then(() => {
            obtenerAdmin();
            obtenerProductos();
            obtenerPerfiles('empleado');
            limpiarPerfilActivo();
        });
    }, []);

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message]);

    useEffect(() => {
        const temporizador = window.setTimeout(() => {
            setMostrarBienvenida(false);
        }, 10000);

        return () => window.clearTimeout(temporizador);
    }, []);

    return (
        <div className="admin-dashboard">

            <header className="admin-topbar">

                <div className="admin-topbar-text">
                    <AnimatePresence mode="wait" initial={false}>
                        <m.div
                            key="admin-workspace"
                            className="admin-welcome-message"
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                        >
                            <h1 className="admin-saludo">
                                Bienvenid@, {admin?.nombre || 'Admin'}
                                <span className="admin-saludo-emoji" aria-hidden="true">👋</span>
                            </h1>
                            <p className="admin-subtitulo">
                                Tu espacio de gestión para inventario, perfiles y operaciones.
                            </p>
                        </m.div>
                    </AnimatePresence>

                </div>

                {admin && (
                    <div className="admin-identity">
                        <span className="admin-avatar">♛</span>

                        <div className="admin-identity-text">
                            <AnimatePresence initial={false}>
                                {mostrarBienvenida && (
                                    <m.span
                                        key="admin-identity-name"
                                        className="admin-nombre"
                                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(3px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(3px)' }}
                                        transition={{ duration: reduceMotion ? 0.2 : 0.35 }}
                                    >
                                        {admin.nombre}
                                    </m.span>
                                )}
                            </AnimatePresence>

                            <span className="admin-rol">
                                {admin.rol}
                            </span>
                        </div>
                    </div>
                )}

                <Link className="admin-home-link" to="/">Página principal</Link>
                <button className="admin-home-link" type="button" onClick={() => navigate('/actualizar-datos')}>
                    Actualizar mis datos
                </button>
                <button
                    className="admin-logout-button"
                    type="button"
                    onClick={cerrarSesion}
                    disabled={cerrandoSesion}
                >
                    {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>

            </header>

            {message && (
                <p className="admin-alert">
                    <span className="admin-alert-icon">⚠️</span>
                    {message}
                </p>
            )}

            <div className="admin-grid">

            <section className="admin-panel">

                <div className="admin-panel-head">
                    <h2 className="admin-panel-title">
                        <span className="admin-panel-icon">
                            📦
                        </span>
                        Inventario de productos
                    </h2>

                    <div className="admin-productos-actions">
                        <span className="admin-total">
                            {productos.length} en catálogo
                        </span>
                        <Link className="admin-productos-link" to="/admin/productos">
                            Agregar productos
                        </Link>
                    </div>
                </div>

                {productos.length === 0 ? (

                    <p className="admin-vacio">
                        Todavía no hay productos registrados.
                    </p>

                ) : (

                    <div className="admin-tabla-wrap">

                        <table className="admin-tabla">

                            <thead>
                                <tr>
                                    <th className="admin-th-imagen">
                                        Imagen
                                    </th>

                                    <th className="admin-th-nombre">
                                        Nombre
                                    </th>

                                    <th className="admin-th-precio">
                                        Precio
                                    </th>

                                    <th className="admin-th-stock">
                                        Stock
                                    </th>

                                    <th className="admin-th-estado">
                                        Estado
                                    </th>

                                    <th className="admin-th-accion">
                                        Acción
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {productos.map((producto) => (

                                    <tr
                                        key={producto.id}
                                        className="admin-fila"
                                    >

                                        <td>
                                            <div className="admin-imagen">
                                                <img
                                                    src={urlImagenProducto(producto.image)}
                                                    alt={producto.nombre}
                                                />
                                            </div>
                                        </td>

                                        <td className="admin-celda-nombre">
                                            {producto.nombre}
                                        </td>

                                        <td className="admin-celda-precio">
                                            ${producto.precio}
                                        </td>

                                        <td>
                                            <span className="admin-stock">
                                                {producto.stock}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className="admin-badge"
                                                data-estado={producto.estado}
                                            >
                                                {producto.estado}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="admin-acciones">

                                                <button
                                                    className="admin-btn-editar"
                                                    onClick={() =>
                                                        navigate(
                                                            `/actualizarProducto/${producto.id}`
                                                        )
                                                    }
                                                >
                                                    ✏️
                                                </button>

                                                <button
                                                    className="admin-btn-eliminar"
                                                    title="Eliminar producto"
                                                    aria-label={`Eliminar ${producto.nombre}`}
                                                    onClick={() =>
                                                        eliminarProducto(producto.id)
                                                    }
                                                >
                                                    🗑️
                                                </button>

                                                <div className="admin-stock-ajuste">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={producto.stock}
                                                        value={cantidadesDescontar[producto.id] ?? ''}
                                                        onChange={(event) => SetCantidadesDescontar((actuales) => ({
                                                            ...actuales,
                                                            [producto.id]: event.target.value
                                                        }))}
                                                        aria-label={`Unidades a descontar de ${producto.nombre}`}
                                                        placeholder="Cant."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => descontarStock(producto)}
                                                        disabled={producto.stock < 1 || productoDescontando === producto.id}
                                                    >
                                                        {productoDescontando === producto.id ? '…' : 'Descontar'}
                                                    </button>
                                                </div>

                                            </div>
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>
                      

                    </div>

                )}

            </section>

            <section className="admin-panel admin-panel-compra">
                <div className="admin-panel-head">
                    <h2 className="admin-panel-title">
                        <span className="admin-panel-icon"><ShoppingBag aria-hidden="true" /></span>
                        Realizar compra
                    </h2>
                    <span className="admin-compra-etiqueta">Entrada de inventario</span>
                </div>

                <div className="admin-compra-layout">
                    <form className="admin-form admin-compra-form" onSubmit={handleSubmit}>
                        <div className="admin-compra-campo admin-compra-producto">
                            <label className="admin-label" htmlFor="producto">Producto</label>
                            <select id="producto" className="admin-input" value={productoId} onChange={(e) => SetProductoId(e.target.value)} required>
                                <option value="">Selecciona un producto</option>
                                {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
                            </select>
                        </div>
                        <div className="admin-compra-campo">
                            <label className="admin-label" htmlFor="fecha-compra">Fecha de compra</label>
                            <div className="admin-compra-input-icono">
                                <CalendarDays size={17} aria-hidden="true" />
                                <input id="fecha-compra" className="admin-input" type="date" value={fecha} onChange={(e) => SetFecha(e.target.value)} required />
                            </div>
                        </div>
                        <div className="admin-compra-campo">
                            <label className="admin-label" htmlFor="cantidad-compra">Unidades</label>
                            <input id="cantidad-compra" className="admin-input" type="number" placeholder="0" value={cantidad} onChange={(e) => SetCantidad(e.target.value)} min="1" step="1" required />
                            <span className="admin-help">Cantidad recibida</span>
                        </div>
                        <div className="admin-compra-campo">
                            <label className="admin-label" htmlFor="precio-compra">Costo por unidad</label>
                            <div className="admin-compra-prefijo"><span>$</span><input id="precio-compra" className="admin-input" type="number" placeholder="0" value={precio_compra} onChange={(e) => SetPrecioCompra(e.target.value)} min="0" step="1" required /></div>
                            <span className="admin-help">Valor en pesos colombianos</span>
                        </div>
                        <button className="admin-btn-comprar" type="submit" disabled={!productos.length}>
                            <ReceiptText size={17} aria-hidden="true" /> Registrar compra
                        </button>
                    </form>

                    <aside className="admin-compra-resumen" aria-live="polite">
                        <div className="admin-compra-resumen-icono"><Package size={19} aria-hidden="true" /></div>
                        <div className="admin-compra-resumen-titulo"><span>Resumen de compra</span><small>El inventario se actualizará al registrar</small></div>
                        <div className="admin-compra-resumen-producto">
                            <span>{productoCompraSeleccionado?.nombre || 'Selecciona un producto'}</span>
                            <small>{productoCompraSeleccionado ? `${cantidad || 0} unidades · ${formatoMoneda(precio_compra)} c/u` : 'Elige un artículo del catálogo'}</small>
                        </div>
                        {productoCompraSeleccionado && <div className="admin-compra-stock">Stock actual <strong>{productoCompraSeleccionado.stock} unidades</strong></div>}
                        <div className="admin-compra-total"><span>Total estimado</span><strong>{formatoMoneda(totalCompraEstimado)}</strong></div>
                    </aside>
                </div>
            </section>

            </div>

            <RegistrarPago rol="administrador" />
            <HistorialPagos />
            <ReportesAdmin />

            <section className="admin-perfiles">
                <div className="admin-panel-head admin-perfiles-head">
                    <div>
                        <h2 className="admin-panel-title">
                            <span className="admin-panel-icon">👥</span>
                            Perfiles de usuarios
                        </h2>
                    </div>
                    <div className="admin-perfiles-roles" role="group" aria-label="Filtrar perfiles por rol">
                        <button
                            type="button"
                            className={rolPerfil === 'empleado' ? 'activo' : ''}
                            aria-pressed={rolPerfil === 'empleado'}
                            onClick={() => {
                                SetRolPerfil('empleado');
                                obtenerPerfiles('empleado');
                            }}
                        >Empleados</button>
                        <button
                            type="button"
                            className={rolPerfil === 'cliente' ? 'activo' : ''}
                            aria-pressed={rolPerfil === 'cliente'}
                            onClick={() => {
                                SetRolPerfil('cliente');
                                obtenerPerfiles('cliente');
                            }}
                        >Clientes</button>
                    </div>
                </div>

                {cargandoPerfiles && <p className="admin-perfiles-vacio">Cargando perfiles…</p>}
                {!cargandoPerfiles && perfiles.length === 0 && (
                    <p className="admin-perfiles-vacio">No hay perfiles registrados.</p>
                )}
                <div className="admin-perfiles-lista">
                        {perfiles.map((usuario) => (
                        <article className="admin-perfil-item" key={usuario.id}>
                            <span className="admin-perfil-avatar" aria-hidden="true">{usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}</span>
                            <span className="admin-perfil-item-texto">
                                <strong>{usuario.nombre}</strong>
                                <small>{usuario.email}</small>
                                <span className="admin-perfil-rol">{usuario.rol}</span>
                            </span>
                            <span className="admin-perfil-citas-resumen">
                                <strong>{usuario.resumenCitas.total} citas</strong>
                                <small>Pendientes {usuario.resumenCitas.pendientes} · Confirmadas {usuario.resumenCitas.confirmadas}</small>
                                <small>Finalizadas {usuario.resumenCitas.finalizadas} · Canceladas {usuario.resumenCitas.canceladas}</small>
                            </span>
                            <button type="button" className="admin-perfil-ir" onClick={() => abrirPerfil(usuario)}>
                                Ir al panel y gestionar citas
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="admin-historial">

                <div className="admin-panel-head">
                    <h2 className="admin-panel-title">
                        <span className="admin-panel-icon">
                            🕘
                        </span>
                        Últimas compras
                    </h2>

                    <button
                        type="button"
                        className="admin-historial-toggle"
                        aria-expanded={historialVisible}
                        aria-controls="admin-historial-detalle"
                        onClick={alternarHistorial}
                    >
                        {cargandoHistorial
                            ? 'Cargando…'
                            : historialVisible
                                ? 'Ocultar compras'
                                : 'Ver compras'}
                    </button>
                </div>

                {historialVisible && (cargandoHistorial ? (
                    <p className="admin-historial-vacio" role="status">Cargando compras...</p>
                ) : historial.length === 0 ? (

                    <p className="admin-historial-vacio">
                        Todavía no hay compras registradas.
                    </p>

                ) : (

                    <div className="admin-historial-tabla-wrap">

                        <table className="admin-historial-tabla">

                            <thead>
                                <tr>
                                    <th>
                                        Fecha
                                    </th>

                                    <th>
                                        Producto
                                    </th>

                                    <th className="admin-historial-cantidad">
                                        Cantidad
                                    </th>

                                    <th>
                                        Precio de compra
                                    </th>

                                    <th>
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {historial.map((histo) => (

                                    <tr
                                        key={histo.id}
                                        className="admin-historial-fila"
                                    >

                                        <td className="admin-historial-fecha">
                                            {histo.fecha?.split("T")[0]}
                                        </td>

                                        <td className="admin-historial-producto">
                                            {histo?.Producto?.nombre}
                                        </td>

                                        <td className="admin-historial-cantidad">
                                            {histo.cantidad}
                                        </td>

                                        <td className="admin-historial-precio">
                                            {histo.precio_compra}
                                        </td>

                                        <td className="admin-historial-total">
                                            {histo.total}
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                ))}

            </section>

        </div>
    );
}

export default Admin;
