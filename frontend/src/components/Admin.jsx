import React, { useState, useEffect } from 'react';
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

        } catch (error) {
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

        } catch (error) {
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

        } catch (error) {
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

        } catch (error) {
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
        }catch(error){
            SetMessage('Error de conexion con el servidor');
        }
    }

    useEffect(() => {
        obtenerAdmin();
        obtenerProductos();
        historialCompras();
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

