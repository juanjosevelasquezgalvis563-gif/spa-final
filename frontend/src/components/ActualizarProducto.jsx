import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';




export  function ActualizarProducto() {
    const [nombre, SetNombre] = useState("");
    const [precio, SetPrecio] = useState("");
    const [stock, SetStock] = useState("");
    const [message, SetMessage] = useState("");

    const { id } = useParams();
    const navigate = useNavigate();


    async function productoUpdate(e) {
        e.preventDefault();

        try {
            const response = await fetch(`http://localhost:3000/inser/administrador/productos/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombre,
                    precio: Number(precio),
                    stock: Number(stock),
                }),
            });
            const data = await response.json();
            if (response.ok) {
                SetMessage(data.message);
            }else{
                SetMessage(data.message);
            }
        } catch (error) {
            SetMessage('Error de conexion con el servidor');
        }
    }

    useEffect(() => {
        if (!message) return;

        const temporizador = setTimeout(() => {
            SetMessage("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [message]);

    return (

        <div className="actualizar-producto">

            <div className="actualizar-producto-card">

                <h2 className="actualizar-producto-title">
                    Actualizar producto
                </h2>

                <p className="actualizar-producto-sub">
                    Modifica la información del producto y guarda los cambios.
                </p>

                <form
                    className="actualizar-producto-form"
                    onSubmit={productoUpdate}
                >

                    <div className="actualizar-producto-campo">
                        <label htmlFor="producto-nombre">
                            Nombre
                        </label>
                        <input
                            id="producto-nombre"
                            className="actualizar-producto-input"
                            type="text"
                            placeholder="Nombre del producto"
                            value={nombre}
                            onChange={(e) => SetNombre(e.target.value)}
                            required
                        />
                    </div>

                    <div className="actualizar-producto-campo">
                        <label htmlFor="producto-precio">
                            Precio
                        </label>
                        <input
                            id="producto-precio"
                            className="actualizar-producto-input"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={precio}
                            onChange={(e) => SetPrecio(e.target.value)}
                            required
                        />
                    </div>

                    <div className="actualizar-producto-campo">
                        <label htmlFor="producto-stock">
                            Stock
                        </label>
                        <input
                            id="producto-stock"
                            className="actualizar-producto-input"
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={stock}
                            onChange={(e) => SetStock(e.target.value)}
                            required
                        />
                    </div>

                    <div className="actualizar-producto-botones">
                        <button
                            className="actualizar-producto-btn"
                            type="submit"
                        >
                            Guardar cambios
                        </button>

                        <button
                            className="actualizar-producto-btn volver"
                            type="button"
                            onClick={() => navigate("/admin")}
                        >
                            Volver
                        </button>
                    </div>

                    {message && (
                        <p className="actualizar-producto-message">
                            {message}
                        </p>
                    )}

                </form>

            </div>

        </div>

    )
}

export default ActualizarProducto;
