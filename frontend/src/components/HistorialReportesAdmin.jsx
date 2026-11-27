import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { API_ROOT } from '../lib/api';
import './ReportesAdmin.css';

const BASE = `${API_ROOT}/inser/administrador/reportes`;
const cop = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(valor) || 0);

function formatearFechaReporte(valor) {
    if (!valor) return 'Fecha no disponible';
    const fecha = new Date(valor);
    return Number.isFinite(fecha.getTime()) ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(fecha) : 'Fecha no disponible';
}

async function leerJson(response) {
    try { return await response.json(); } catch { return {}; }
}

export default function HistorialReportesAdmin({ onAbrirReporte }) {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [buscar, setBuscar] = useState('');

    const cargarHistorial = useCallback(async () => {
        setCargando(true);
        setError('');
        try {
            const response = await fetch(`${BASE}/historial`, { credentials: 'include' });
            const data = await leerJson(response);
            if (!response.ok || !Array.isArray(data)) throw new Error('No se pudo cargar el historial.');
            setHistorial(data);
        } catch {
            setError('No se pudo cargar el historial. Intenta actualizar la página.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

    const filtrados = useMemo(() => {
        const consulta = buscar.trim().toLocaleLowerCase('es-CO');
        return consulta ? historial.filter((item) => `${item.nombre_mes} ${item.anio} ${item.cliente_mas_fiel || ''} ${item.empleado_mas_solicitado || ''}`.toLocaleLowerCase('es-CO').includes(consulta)) : historial;
    }, [historial, buscar]);

    return (
        <section className="admin-panel reportes-panel reportes-historial-panel">
            <section className="reportes-historial" aria-labelledby="reportes-historial-titulo">
                <div className="reportes-historial-cabecera">
                    <div>
                        <span className="reportes-section-kicker">CONSULTAS ANTERIORES</span>
                        <h3 id="reportes-historial-titulo">Historial de reportes</h3>
                        <p>Se conservan los períodos anteriores; abrir uno no modifica ni reinicia sus datos.</p>
                    </div>
                    {historial.length > 0 && <label className="reportes-busqueda">
                        <Search size={16} aria-hidden="true" />
                        <input aria-label="Buscar en historial" placeholder="Buscar período, cliente o empleado" value={buscar} onChange={(event) => setBuscar(event.target.value)} />
                        {buscar && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBuscar('')}><X size={15} /></button>}
                    </label>}
                </div>
                {cargando ? <p className="reportes-historial-estado" role="status">Cargando períodos guardados…</p>
                    : error ? <div className="reportes-historial-estado error" role="alert"><span>{error}</span><button type="button" className="reportes-boton-secundario" onClick={cargarHistorial}>Volver a intentar</button></div>
                        : historial.length === 0 ? <p className="reportes-historial-estado">Todavía no hay reportes guardados. Al consultar un mes anterior, quedará guardado aquí.</p>
                            : filtrados.length === 0 ? <p className="reportes-historial-estado">No hay reportes que coincidan con “{buscar}”.</p>
                                : <div className="reportes-historial-lista">
                                    {filtrados.map((h) => (
                                        <article className="reportes-historial-item" key={h.id}>
                                            <header className="reportes-historial-item-cabecera">
                                                <div><span className="reportes-section-kicker">PERÍODO</span><h4>{h.nombre_mes} {h.anio}</h4><small>Generado: {formatearFechaReporte(h.generado_en)}</small></div>
                                                <span className={`reportes-historial-badge${h.enviado_en ? ' enviado' : ''}`}>{h.enviado_en ? `Enviado ${formatearFechaReporte(h.enviado_en)}` : 'Disponible para consulta'}</span>
                                            </header>
                                            <div className="reportes-historial-metricas">
                                                <div><span>Ingresos totales</span><strong>{cop(h.ingresos)}</strong><small>Online {cop(h.ingresos_online)} · Local {cop(h.ingresos_locales)}</small></div>
                                                <div><span>Compras de inventario</span><strong>{cop(h.egresos)}</strong><small>{h.cantidad_compras || 0} compras registradas</small></div>
                                                <div><span>Ingresos menos compras</span><strong>{cop(h.resultado_despues_compras)}</strong><small>No equivale a utilidad neta</small></div>
                                                <div><span>Actividad de citas</span><strong>{h.citas_total || 0} citas</strong><small>{h.citas_finalizadas || 0} finalizadas</small></div>
                                            </div>
                                            <div className="reportes-historial-destacados">
                                                <p><span>Cliente más fiel</span><strong>{h.cliente_mas_fiel || 'Sin datos en este período'}</strong></p>
                                                <p><span>Empleado más solicitado</span><strong>{h.empleado_mas_solicitado || 'Sin datos en este período'}</strong></p>
                                            </div>
                                            <footer className="reportes-historial-item-acciones">
                                                <button type="button" className="reportes-boton-secundario" onClick={() => onAbrirReporte?.(h.id)}>Abrir reporte completo</button>
                                            </footer>
                                        </article>
                                    ))}
                                </div>}
            </section>
        </section>
    );
}
