import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, Mail, RefreshCw } from 'lucide-react';
import { API_ROOT } from '../lib/api';
import './ReportesAdmin.css';

const BASE = `${API_ROOT}/inser/administrador/reportes`;

const cop = (valor) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);

function mesActual() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function separarPeriodo(periodo) {
    const [anio, mes] = periodo.split('-').map(Number);
    return { anio, mes };
}

async function leerJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

export default function ReportesAdmin() {
    const [periodo, setPeriodo] = useState(mesActual());
    const [email, setEmail] = useState('');
    const [reporte, setReporte] = useState(null);
    const [enCurso, setEnCurso] = useState(false);
    const [enviadoEn, setEnviadoEn] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [estado, setEstado] = useState(null); // { tipo: 'ok' | 'error', texto }

    const cargarHistorial = useCallback(async () => {
        try {
            const response = await fetch(`${BASE}/historial`, { credentials: 'include' });
            const data = await leerJson(response);
            if (response.ok && Array.isArray(data)) setHistorial(data);
        } catch {
            // El historial es opcional; si falla no se bloquea la pantalla.
        }
    }, []);

    const cargarReporte = useCallback(async ({ recalcular = false, signal } = {}) => {
        const { anio, mes } = separarPeriodo(periodo);
        setCargando(true);
        setEstado(null);

        try {
            const params = new URLSearchParams({ anio, mes });
            if (recalcular) params.set('recalcular', 'true');

            const response = await fetch(`${BASE}/mensual?${params}`, {
                credentials: 'include',
                signal
            });
            const data = await leerJson(response);

            if (!response.ok) {
                setReporte(null);
                setEstado({ tipo: 'error', texto: data.message || 'No se pudo cargar el reporte.' });
                return;
            }

            setReporte(data.reporte);
            setEnCurso(Boolean(data.en_curso));
            setEnviadoEn(data.enviado_en);
            cargarHistorial();
        } catch (error) {
            if (error.name === 'AbortError') return;
            setReporte(null);
            setEstado({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
        } finally {
            if (!signal?.aborted) setCargando(false);
        }
    }, [periodo, cargarHistorial]);

    
    useEffect(() => {
        const controlador = new AbortController();
        cargarReporte({ signal: controlador.signal });
        return () => controlador.abort();
    }, [cargarReporte]);

    async function enviarPorCorreo() {
        const { anio, mes } = separarPeriodo(periodo);
        setEnviando(true);
        setEstado(null);

        try {
            const response = await fetch(`${BASE}/mensual/enviar`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anio,
                    mes,
                    ...(email.trim() ? { email: email.trim() } : {})
                })
            });
            const data = await leerJson(response);

            setEstado(response.ok
                ? { tipo: 'ok', texto: data.message || 'Reporte enviado correctamente.' }
                : { tipo: 'error', texto: data.message || 'No se pudo enviar el reporte.' });
            if (response.ok) {
                setEnviadoEn(new Date().toISOString());
                cargarHistorial();
            }
        } catch {
            setEstado({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
        } finally {
            setEnviando(false);
        }
    }

    const fiel = reporte?.cliente_mas_fiel;
    const solicitado = reporte?.empleado_mas_solicitado;

    return (
        <section className="admin-panel reportes-panel">
            <div className="admin-panel-head">
                <h2 className="admin-panel-title">
                    <span className="admin-panel-icon"><BarChart3 aria-hidden="true" /></span>
                    Reportes y estadísticas
                </h2>
                {reporte && (
                    <span className="admin-total">
                        {reporte.periodo.nombre_mes} {reporte.periodo.anio}
                        {enCurso ? ' · mes en curso (parcial)' : ''}
                    </span>
                )}
            </div>

            <div className="reportes-controles">
                <div className="reportes-campo">
                    <label className="admin-label" htmlFor="reporte-periodo">Mes</label>
                    <input
                        id="reporte-periodo"
                        className="admin-input"
                        type="month"
                        value={periodo}
                        max={mesActual()}
                        onChange={(e) => e.target.value && setPeriodo(e.target.value)}
                    />
                </div>

                <div className="reportes-campo reportes-campo-correo">
                    <label className="admin-label" htmlFor="reporte-correo">Enviar a (opcional)</label>
                    <input
                        id="reporte-correo"
                        className="admin-input"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <button
                    type="button"
                    className="pc-submit"
                    onClick={() => cargarReporte({ recalcular: true })}
                    disabled={cargando}
                >
                    <RefreshCw size={16} aria-hidden="true" /> {cargando ? 'Cargando…' : 'Actualizar'}
                </button>

                <button type="button" className="pc-submit" onClick={() => window.print()} disabled={!reporte}>
                    <Download size={16} aria-hidden="true" /> Descargar PDF
                </button>

                <button
                    type="button"
                    className="pc-submit"
                    onClick={enviarPorCorreo}
                    disabled={enviando || cargando || !reporte}
                >
                    <Mail size={16} aria-hidden="true" /> {enviando ? 'Enviando…' : 'Enviar al correo'}
                </button>
            </div>

            <p className="reportes-programacion">
                Envío automático al correo del administrador cada 15 días. Para activarlo en el servidor, configura
                <code> REPORTES_QUINCENALES_ACTIVO=true</code>; mientras haces pruebas puedes usar “Enviar al correo”.
            </p>

            {estado && (
                <p className={`reportes-estado reportes-estado-${estado.tipo}`} role="status">
                    {estado.texto}
                </p>
            )}

            {cargando && !reporte && <p className="admin-vacio" role="status">Cargando reporte…</p>}

            {reporte && (
                <>
                    {reporte.meta.modo_pruebas && (
                        <p className="reportes-aviso">
                            Los pagos en línea (Wompi) están en modo de pruebas: los ingresos por reservas no son dinero real.
                        </p>
                    )}

                    <div className="reportes-tarjetas">
                        <div className="reportes-tarjeta reportes-tarjeta-fuerte">
                            <small>Ingresos totales</small>
                            <strong>{cop(reporte.ingresos.total)}</strong>
                        </div>
                        <div className="reportes-tarjeta">
                            <small>Ingresos online ({reporte.ingresos.online?.cantidad ?? reporte.ingresos.reservas_wompi.cantidad})</small>
                            <strong>{cop(reporte.ingresos.online?.total ?? reporte.ingresos.reservas_wompi.total)}</strong>
                        </div>
                        <div className="reportes-tarjeta">
                            <small>Ingresos locales ({reporte.ingresos.local?.cantidad ?? reporte.ingresos.saldo_salon.cantidad})</small>
                            <strong>{cop(reporte.ingresos.local?.total ?? reporte.ingresos.saldo_salon.total)}</strong>
                        </div>
                        <div className="reportes-tarjeta">
                            <small>Compras ({reporte.compras.cantidad_compras})</small>
                            <strong>{cop(reporte.compras.total)}</strong>
                        </div>
                        <div className="reportes-tarjeta reportes-tarjeta-fuerte">
                            <small>Utilidad</small>
                            <strong>{cop(reporte.balance.utilidad)}</strong>
                        </div>
                    </div>

                    <div className="reportes-destacados">
                        <div className="reportes-tarjeta">
                            <small>Cliente más fiel</small>
                            <strong>{fiel ? fiel.nombre : 'Sin datos'}</strong>
                            {fiel && (
                                <span>{fiel.citas_finalizadas} citas finalizadas · {cop(fiel.total_gastado)}</span>
                            )}
                        </div>
                        <div className="reportes-tarjeta">
                            <small>Empleado más solicitado</small>
                            <strong>{solicitado ? solicitado.nombre : 'Sin datos'}</strong>
                            {solicitado && (
                                <span>{solicitado.solicitudes} citas · {solicitado.finalizadas} finalizadas</span>
                            )}
                        </div>
                    </div>

                    <div className="reportes-tarjetas reportes-citas-resumen">
                        <div className="reportes-tarjeta"><small>Citas registradas</small><strong>{reporte.citas.total}</strong></div>
                        {Object.entries(reporte.citas.por_estado || {}).map(([estadoCita, total]) => (
                            <div className="reportes-tarjeta" key={estadoCita}><small>Citas {estadoCita.replace('_', ' ')}</small><strong>{total}</strong></div>
                        ))}
                        <div className="reportes-tarjeta"><small>Compras de inventario</small><strong>{reporte.compras.cantidad_compras} compras · {reporte.compras.unidades} unidades</strong></div>
                    </div>

                    <div className="reportes-listas">
                        <TablaTop
                            titulo="Top clientes"
                            columnas={['Cliente', 'Citas', 'Gastado']}
                            filas={reporte.top_clientes.map((c) => [c.nombre, c.citas_finalizadas, cop(c.total_gastado)])}
                        />
                        <TablaTop
                            titulo="Top empleados"
                            columnas={['Empleado', 'Citas', 'Facturado']}
                            filas={reporte.top_empleados.map((e) => [e.nombre, e.solicitudes, cop(e.facturado)])}
                        />
                        <TablaTop
                            titulo="Servicios más pedidos"
                            columnas={['Servicio', 'Citas', 'Facturado']}
                            filas={reporte.top_servicios.map((s) => [s.nombre, s.solicitudes, cop(s.facturado)])}
                        />
                        <TablaTop
                            titulo="Productos más comprados"
                            columnas={['Producto', 'Unidades', 'Gasto']}
                            filas={reporte.compras.top_productos.map((p) => [p.nombre, p.unidades, cop(p.gasto)])}
                        />
                    </div>

                    {enviadoEn && (
                        <p className="reportes-nota">
                            {`Este reporte se envió por correo el ${new Date(enviadoEn).toLocaleDateString('es-CO')}.`}
                        </p>
                    )}
                </>
            )}

            {historial.length > 0 && (
                <div className="reportes-historial">
                    <h3>Reportes guardados</h3>
                    <div className="admin-tabla-wrap">
                        <table className="admin-tabla">
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th>Ingresos</th>
                                    <th>Compras</th>
                                    <th>Utilidad</th>
                                    <th>Cliente más fiel</th>
                                    <th>Empleado más solicitado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map((h) => (
                                    <tr key={h.id} className="admin-fila">
                                        <td>{h.nombre_mes} {h.anio}</td>
                                        <td>{cop(h.ingresos)}</td>
                                        <td>{cop(h.egresos)}</td>
                                        <td>{cop(h.utilidad)}</td>
                                        <td>{h.cliente_mas_fiel || '—'}</td>
                                        <td>{h.empleado_mas_solicitado || '—'}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="pc-submit"
                                                onClick={() => setPeriodo(`${h.anio}-${String(h.mes).padStart(2, '0')}`)}
                                            >
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

function TablaTop({ titulo, columnas, filas }) {
    return (
        <div className="reportes-lista">
            <h3>{titulo}</h3>
            {filas.length === 0 ? (
                <p className="admin-vacio">Sin datos en este mes.</p>
            ) : (
                <div className="admin-tabla-wrap">
                    <table className="admin-tabla">
                        <thead>
                            <tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                            {filas.map((fila, i) => (
                                <tr key={i} className="admin-fila">
                                    {fila.map((celda, j) => <td key={j}>{celda}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
