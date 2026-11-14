
import { useEffect, useState } from 'react';
import { API_ROOT } from '../lib/api';

function HistorialPagos() {
    const [pagos, setPagos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [visible, setVisible] = useState(false);
    const [cargado, setCargado] = useState(false);
    const [mensaje, setMensaje] = useState('');

    async function obtenerHistorialPagos() {
        setCargando(true);
        setMensaje('');

        try {
            const response = await fetch(
                `${API_ROOT}/inser/administrador/historialPagos`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (response.ok) {
                setPagos(data);
                setCargado(true);
            } else {
                setMensaje(data.message || 'No se pudo cargar el historial de pagos.');
            }

        } catch {
            setMensaje('Error de conexión con el servidor.');
        } finally {
            setCargando(false);
        }
    }

    async function alternarHistorial() {
        const mostrar = !visible;
        setVisible(mostrar);

        if (mostrar && !cargado) {
            await obtenerHistorialPagos();
        }
    }

    return (
        <section className="admin-historial">
            <div className="admin-panel-head">
                <h2 className="admin-panel-title">
                    <span className="admin-panel-icon">💰</span>
                    Historial de pagos
                </h2>

                <button
                    type="button"
                    className="admin-historial-toggle"
                    onClick={alternarHistorial}
                    aria-expanded={visible}
                >
                    {cargando
                        ? 'Cargando...'
                        : visible
                            ? 'Ocultar pagos'
                            : 'Ver pagos'}
                </button>
            </div>

            {visible && (
                <>
                    {cargando ? (
                        <p className="admin-historial-vacio">
                            Cargando historial de pagos...
                        </p>
                    ) : mensaje ? (
                        <p className="admin-historial-vacio">
                            {mensaje}
                        </p>
                    ) : pagos.length === 0 ? (
                        <p className="admin-historial-vacio">
                            Todavía no hay pagos registrados.
                        </p>
                    ) : (
                        <div className="admin-historial-tabla-wrap">
                            <table className="admin-historial-tabla">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Empleado</th>
                                        <th>Servicio</th>
                                        <th>Fecha de cita</th>
                                        <th>Hora</th>
                                        <th>Fecha de pago</th>
                                        <th>Total pagado</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pagos.map((pago) => (
                                        <tr
                                            key={pago.id}
                                            className="admin-historial-fila"
                                        >
                                            <td>
                                                {pago.cita?.cliente?.nombre || 'No disponible'}
                                            </td>

                                            <td>
                                                {pago.cita?.empleado?.nombre || 'No disponible'}
                                            </td>

                                            <td>
                                                {pago.cita?.Servicio?.nombre || 'No disponible'}
                                            </td>

                                            <td>
                                                {pago.cita?.fecha?.split('T')[0] || 'No disponible'}
                                            </td>

                                            <td>
                                                {pago.cita?.hora || 'No disponible'}
                                            </td>

                                            <td>
                                                {pago.fecha_pago?.split('T')[0] || pago.fecha_pago || 'No disponible'}
                                            </td>

                                            <td className="admin-historial-total">
                                                ${Number(pago.total_pago || 0).toLocaleString('es-CO')}
                                            </td>

                                            <td>
                                                <span className="admin-badge" data-estado={pago.estado_pago}>
                                                    {pago.estado_pago}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default HistorialPagos;
