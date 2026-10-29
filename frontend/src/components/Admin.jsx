import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Admin() {

    const [admin, SetAdmin] = useState(null);
    const [productos, SetProductos] = useState([]);
    const [historial, SetHistorial] = useState([]);
    const [message, SetMessage] = useState('');

    const [productoId, SetProductoId] = useState("");
    const [fecha, SetFecha] = useState("");
    const [cantidad, SetCantidad] = useState("");
    const [precio_compra, SetPrecioCompra] = useState("");
    const [rolPerfil, SetRolPerfil] = useState('empleado');
    const [perfiles, SetPerfiles] = useState([]);
    const [perfilSeleccionado, SetPerfilSeleccionado] = useState(null);
    const [cargandoPerfiles, SetCargandoPerfiles] = useState(false);

    const navigate = useNavigate();

    async function obtenerAdmin() {
        try {
            const response = await fetch(
                'http://localhost:3000/inser/administrador',
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
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function obtenerProductos() {
        try {
            const response = await fetch(
                'http://localhost:3000/inser/administrador/productos',
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
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function eliminarProducto(id) {
        try {
            const response = await fetch(
                `http://localhost:3000/inser/administrador/productos/${id}`,
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
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const response = await fetch(
                'http://localhost:3000/inser/administrador/compras',
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
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function historialCompras(){
        try{
            const response = await fetch('http://localhost:3000/inser/administrador/historialCompras',{
                method:'GET',
                credentials:'include'
            });
            const data = await response.json();
            if(response.ok){
                SetHistorial(data);
            }else{
                SetMessage(data.message);
            }
        }catch{
            SetMessage('Error de conexion con el servidor');
        }
    }

    async function obtenerPerfiles(rol = rolPerfil) {
        SetCargandoPerfiles(true);
        SetPerfiles([]);
        SetPerfilSeleccionado(null);

        try {
            const response = await fetch(
                `http://localhost:3000/inser/administrador/perfiles?rol=${rol}`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (response.ok) {
                SetPerfiles(data);
            } else {
                SetMessage(data.message || 'No se pudieron cargar los perfiles.');
            }
        } catch {
            SetMessage('Error de conexión al cargar los perfiles.');
        } finally {
            SetCargandoPerfiles(false);
        }
    }

    async function seleccionarPerfil(usuario) {
        SetPerfilSeleccionado({ usuario, citas: null, cargando: true });

        try {
            const response = await fetch(
                `http://localhost:3000/inser/administrador/perfiles/${usuario.id}?rol=${rolPerfil}`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (response.ok) {
                SetPerfilSeleccionado({ ...data, cargando: false });
            } else {
                SetPerfilSeleccionado(null);
                SetMessage(data.message || 'No se pudo abrir el perfil.');
            }
        } catch {
            SetPerfilSeleccionado(null);
            SetMessage('Error de conexión al abrir el perfil.');
        }
    }

    useEffect(() => {
        void Promise.resolve().then(() => {
            obtenerAdmin();
            obtenerProductos();
            historialCompras();
            obtenerPerfiles('empleado');
        });
    }, []);

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message]);

    return (
        <div className="admin-dashboard">

            <header className="admin-topbar">

                <div className="admin-topbar-text">

                    <h1 className="admin-saludo">
                        Hola, {admin ? admin.nombre : 'Admin'}
                        <span className="admin-saludo-emoji">
                            👋
                        </span>
                    </h1>

                    <p className="admin-subtitulo">
                        Aquí tienes el resumen de tu inventario y operaciones.
                    </p>

                </div>

                {admin && (
                    <div className="admin-identity">
                        <span className="admin-avatar">♛</span>

                        <div className="admin-identity-text">
                            <span className="admin-nombre">
                                {admin.nombre}
                            </span>

                            <span className="admin-rol">
                                {admin.rol}
                            </span>
                        </div>
                    </div>
                )}

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

                    <span className="admin-total">
                        {productos.length} en catálogo
                    </span>
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
                                                    src={producto.image}
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
                        <span className="admin-panel-icon">
                            🛒
                        </span>
                        Realizar compra
                    </h2>
                </div>

                <div>

                    <form className="admin-form" onSubmit={handleSubmit}>

                        <label className="admin-label" htmlFor="producto">
                            Producto
                        </label>

                        <select
                            id="producto"
                            className="admin-input"
                            value={productoId}
                            onChange={(e) =>
                                SetProductoId(e.target.value)
                            }
                            required
                        >

                            <option value="">
                                Seleccione un producto
                            </option>

                            {productos.map((producto) => (
                                <option
                                    key={producto.id}
                                    value={producto.id}
                                >
                                    {producto.nombre}
                                </option>
                            ))}

                        </select>

                        <label className="admin-label" htmlFor="fecha-compra">
                            Fecha de compra
                        </label>

                        <input
                            id="fecha-compra"
                            className="admin-input"
                            type="date"
                            value={fecha}
                            onChange={(e) =>
                                SetFecha(e.target.value)
                            }
                            required
                        />

                        <div className="admin-form-fila">

                            <div className="admin-form-col">

                                <label className="admin-label" htmlFor="cantidad-compra">
                                    Cantidad
                                </label>

                                <input
                                    id="cantidad-compra"
                                    className="admin-input"
                                    type="number"
                                    placeholder="Cantidad"
                                    value={cantidad}
                                    onChange={(e) =>
                                        SetCantidad(e.target.value)
                                    }
                                    min="1"
                                    required
                                />

                                <span className="admin-help">
                                    Mínimo 1
                                </span>

                            </div>

                            <div className="admin-form-col">

                                <label className="admin-label" htmlFor="precio-compra">
                                    Precio de compra
                                </label>

                                <input
                                    id="precio-compra"
                                    className="admin-input"
                                    type="number"
                                    placeholder="Precio de compra"
                                    value={precio_compra}
                                    onChange={(e) =>
                                        SetPrecioCompra(e.target.value)
                                    }
                                    min="0"
                                    required
                                />

                                <span className="admin-help">
                                    Mínimo 0
                                </span>

                            </div>

                        </div>

                        <button
                            className="admin-btn-comprar"
                            type="submit"
                        >
                            Registrar compra
                        </button>

                    </form>

                </div>

            </section>

            </div>

            <section className="admin-perfiles">
                <div className="admin-panel-head admin-perfiles-head">
                    <div>
                        <h2 className="admin-panel-title">
                            <span className="admin-panel-icon">👥</span>
                            Perfiles de usuarios
                        </h2>
                        <p className="admin-perfiles-intro">
                            Selecciona un empleado o cliente para consultar sus datos y citas.
                        </p>
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

                <div className="admin-perfiles-layout">
                    <div className="admin-perfiles-lista" aria-label={`Lista de ${rolPerfil === 'empleado' ? 'empleados' : 'clientes'}`}>
                        {cargandoPerfiles && <p className="admin-perfiles-vacio">Cargando perfiles…</p>}
                        {!cargandoPerfiles && perfiles.length === 0 && (
                            <p className="admin-perfiles-vacio">No hay {rolPerfil === 'empleado' ? 'empleados' : 'clientes'} registrados.</p>
                        )}
                        {!cargandoPerfiles && perfiles.map((usuario) => (
                            <button
                                type="button"
                                key={usuario.id}
                                className={`admin-perfil-item${perfilSeleccionado?.usuario?.id === usuario.id ? ' seleccionado' : ''}`}
                                onClick={() => seleccionarPerfil(usuario)}
                            >
                                <span className="admin-perfil-avatar" aria-hidden="true">{usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}</span>
                                <span className="admin-perfil-item-texto">
                                    <strong>{usuario.nombre}</strong>
                                    <small>{usuario.email}</small>
                                </span>
                                <span className="admin-perfil-flecha" aria-hidden="true">›</span>
                            </button>
                        ))}
                    </div>

                    <div className="admin-perfil-detalle" aria-live="polite">
                        {!perfilSeleccionado && (
                            <div className="admin-perfil-placeholder">
                                <span aria-hidden="true">👤</span>
                                <p>Selecciona un perfil para ver sus datos y citas.</p>
                            </div>
                        )}
                        {perfilSeleccionado?.cargando && <p className="admin-perfiles-vacio">Cargando perfil…</p>}
                        {perfilSeleccionado && !perfilSeleccionado.cargando && (
                            <>
                                <div className="admin-perfil-resumen">
                                    <span className="admin-perfil-avatar grande" aria-hidden="true">
                                        {perfilSeleccionado.usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                    <div>
                                        <span className="admin-perfil-rol">{perfilSeleccionado.usuario.rol}</span>
                                        <h3>{perfilSeleccionado.usuario.nombre}</h3>
                                        <p>{perfilSeleccionado.usuario.email}</p>
                                        <p>{perfilSeleccionado.usuario.telefono || 'Teléfono no registrado'}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="admin-abrir-panel-perfil"
                                    onClick={() => navigate(`/${rolPerfil}?perfilId=${perfilSeleccionado.usuario.id}`)}
                                >
                                    Abrir panel original de {rolPerfil === 'empleado' ? 'empleado' : 'cliente'}
                                </button>
                                <div className="admin-perfil-citas-head">
                                    <h3>Citas</h3>
                                    <span>{perfilSeleccionado.citas.length}</span>
                                </div>
                                {perfilSeleccionado.citas.length === 0 ? (
                                    <p className="admin-perfiles-vacio">Este perfil todavía no tiene citas.</p>
                                ) : (
                                    <div className="admin-perfil-citas">
                                        {perfilSeleccionado.citas.map((cita) => {
                                            const otraPersona = rolPerfil === 'empleado' ? cita.cliente : cita.empleado;
                                            return (
                                                <article className="admin-perfil-cita" key={cita.id}>
                                                    <div className="admin-perfil-cita-top">
                                                        <strong>{cita.Servicio?.nombre || 'Servicio'}</strong>
                                                        <span className={`admin-perfil-estado estado-${cita.estado}`}>{cita.estado}</span>
                                                    </div>
                                                    <p>{rolPerfil === 'empleado' ? 'Cliente' : 'Empleado'}: {otraPersona?.nombre || 'No disponible'}</p>
                                                    <small>{cita.fecha?.split('T')[0]} · {cita.hora?.slice(0, 5)}</small>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
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

                    <span className="admin-total">
                        {historial.length} registradas
                    </span>
                </div>

                {historial.length === 0 ? (

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

                )}

            </section>

        </div>
    );
}

export default Admin;

