import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Mail, Package, RefreshCw, Scissors, Search, TrendingUp, Users, X } from 'lucide-react';
import { API_ROOT } from '../lib/api';
import logo from '../assets/image.png';
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

function desplazarPeriodo(periodo, desplazamiento) {
    const { anio, mes } = separarPeriodo(periodo);
    const fecha = new Date(anio, mes - 1 + desplazamiento, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
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
    const [buscarHistorial, setBuscarHistorial] = useState('');
    const [buscarRankings, setBuscarRankings] = useState('');
    const [vistaTendencia, setVistaTendencia] = useState('ingresos-utilidad');
    const [cargando, setCargando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [estado, setEstado] = useState(null); // { tipo: 'ok' | 'error', texto }

    useEffect(() => {
        const limpiarImpresion = () => document.body.classList.remove('imprimiendo-reporte');
        window.addEventListener('afterprint', limpiarImpresion);
        return () => window.removeEventListener('afterprint', limpiarImpresion);
    }, []);

    const imprimirReporte = () => {
        if (!reporte) return;
        document.body.classList.add('imprimiendo-reporte');
        window.print();
    };

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
            setEstado({ tipo: 'error', texto: 'No pudimos cargar el reporte. Revisa tu conexión e inténtalo de nuevo.' });
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
            setEstado({ tipo: 'error', texto: 'No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.' });
        } finally {
            setEnviando(false);
        }
    }

    const fiel = reporte?.cliente_mas_fiel;
    const solicitado = reporte?.empleado_mas_solicitado;

    const historialFiltrado = useMemo(() => {
        const consulta = buscarHistorial.trim().toLocaleLowerCase('es-CO');
        return consulta ? historial.filter((item) => `${item.nombre_mes} ${item.anio} ${item.cliente_mas_fiel || ''} ${item.empleado_mas_solicitado || ''}`.toLocaleLowerCase('es-CO').includes(consulta)) : historial;
    }, [historial, buscarHistorial]);

    const periodoAnteriorKey = useMemo(() => {
        const { anio, mes } = separarPeriodo(periodo);
        const fecha = new Date(anio, mes - 2, 1);
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    }, [periodo]);
    const reporteAnterior = historial.find((item) => `${item.anio}-${String(item.mes).padStart(2, '0')}` === periodoAnteriorKey);
    const filtrarRanking = (elementos, campo = 'nombre') => {
        const consulta = buscarRankings.trim().toLocaleLowerCase('es-CO');
        return consulta ? elementos.filter((item) => String(item[campo] || '').toLocaleLowerCase('es-CO').includes(consulta)) : elementos;
    };

    const tendencia = useMemo(() => {
        const actual = reporte ? { anio: reporte.periodo.anio, mes: reporte.periodo.mes, nombre_mes: reporte.periodo.nombre_mes, ingresos: reporte.balance.ingresos, egresos: reporte.balance.egresos, utilidad: reporte.balance.utilidad } : null;
        return [...historial.filter((item) => `${item.anio}-${String(item.mes).padStart(2, '0')}` !== periodo), ...(actual ? [actual] : [])]
            .sort((a, b) => a.anio - b.anio || a.mes - b.mes).slice(-6);
    }, [historial, reporte, periodo]);

    const porcentajeCambio = (actual, anterior) => !anterior || Number(anterior) === 0 ? null : ((Number(actual) - Number(anterior)) / Math.abs(Number(anterior))) * 100;

    const irMesAnterior = () => setPeriodo((actual) => desplazarPeriodo(actual, -1));
    const irMesSiguiente = () => setPeriodo((actual) => desplazarPeriodo(actual, 1));

    const exportarCsv = () => {
        if (!reporte) return;
        const filas = [
            ['Reporte mensual', `${reporte.periodo.nombre_mes} ${reporte.periodo.anio}`],
            ['Indicador', 'Valor'], ['Ingresos totales', reporte.balance.ingresos],
            ['Ingresos en línea', reporte.ingresos.online?.total ?? reporte.ingresos.reservas_wompi.total],
            ['Ingresos locales', reporte.ingresos.local?.total ?? reporte.ingresos.saldo_salon.total],
            ['Compras de inventario', reporte.balance.egresos], ['Utilidad', reporte.balance.utilidad],
            ['Citas registradas', reporte.citas.total], [], ['Tipo', 'Nombre', 'Cantidad', 'Valor'],
            ...reporte.top_clientes.map((item) => ['Cliente', item.nombre, item.citas_finalizadas, item.total_gastado]),
            ...reporte.top_empleados.map((item) => ['Empleado', item.nombre, item.solicitudes, item.facturado]),
            ...reporte.top_servicios.map((item) => ['Servicio', item.nombre, item.solicitudes, item.facturado]),
            [], ['Productos más comprados', 'Unidades', 'Gasto'],
            ...reporte.compras.top_productos.map((item) => ['Producto', item.nombre, item.unidades, item.gasto]),
            [], ['Estado de cita', 'Cantidad'],
            ...Object.entries(reporte.citas.por_estado || {}),
        ];
        const contenido = filas.map((fila) => fila.map((celda) => `"${String(celda ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8' }));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `reporte-${reporte.periodo.anio}-${String(reporte.periodo.mes).padStart(2, '0')}.csv`;
        enlace.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const estadoCitas = Object.entries(reporte?.citas?.por_estado || {});
    const totalEstadoCitas = estadoCitas.reduce((total, [, cantidad]) => total + Number(cantidad || 0), 0);
    const citasFinalizadas = Number(reporte?.citas?.por_estado?.finalizada || 0);
    const citasCanceladas = Number(reporte?.citas?.por_estado?.cancelada || reporte?.citas?.por_estado?.canceladas || 0);
    const porcentajeFinalizacion = totalEstadoCitas ? (citasFinalizadas / totalEstadoCitas) * 100 : 0;
    const ticketPromedio = citasFinalizadas ? Number(reporte?.ingresos?.total || 0) / citasFinalizadas : 0;
    let acumuladoCitas = 0;
    const coloresCitas = ['#18181b', '#a77b50', '#d6c2ad', '#a1a1aa', '#e4e4e7'];
    const gradienteCitas = estadoCitas.map(([, cantidad], indice) => {
        const inicio = acumuladoCitas;
        acumuladoCitas += totalEstadoCitas ? Number(cantidad) / totalEstadoCitas * 100 : 0;
        return `${coloresCitas[indice % coloresCitas.length]} ${inicio}% ${acumuladoCitas}%`;
    }).join(', ');

    return (
        <section className="admin-panel reportes-panel">
            <div className="reportes-impresion-marca">
                <img src={logo} alt="JC Alta Peluquería" />
                <div><strong>JC Alta Peluquería</strong><span>Informe de gestión</span></div>
                {reporte && <time>{reporte.periodo.nombre_mes} {reporte.periodo.anio}</time>}
            </div>
            <div className="admin-panel-head">
                <h2 className="admin-panel-title">
                    <span className="admin-panel-icon"><BarChart3 aria-hidden="true" /></span>
                    <span><small className="reportes-eyebrow">ANÁLISIS DEL NEGOCIO</small><span className="reportes-title-text">Reportes y estadísticas</span></span>
                </h2>
                {reporte && (
                    <span className="admin-total">
                        {reporte.periodo.nombre_mes} {reporte.periodo.anio}
                        {enCurso ? ' · mes en curso (parcial)' : ''}
                    </span>
                )}
            </div>

            <div className="reportes-controles">
                <div className="reportes-navegacion-meses" role="group" aria-label="Navegar entre meses">
                    <button type="button" className="reportes-boton-secundario reportes-flecha-mes" onClick={irMesAnterior} disabled={cargando} aria-label="Mes anterior">
                        <ChevronLeft size={17} aria-hidden="true" />
                    </button>
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
                    <button type="button" className="reportes-boton-secundario reportes-flecha-mes" onClick={irMesSiguiente} disabled={cargando || periodo >= mesActual()} aria-label="Mes siguiente">
                        <ChevronRight size={17} aria-hidden="true" />
                    </button>
                    <button type="button" className="reportes-boton-secundario reportes-hoy" onClick={() => setPeriodo(mesActual())} disabled={cargando || periodo === mesActual()}>
                        <CalendarDays size={16} aria-hidden="true" /> Mes actual
                    </button>
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

                <button type="button" className="pc-submit" onClick={imprimirReporte} disabled={!reporte}>
                    <Download size={16} aria-hidden="true" /> Descargar PDF
                </button>

                <button type="button" className="reportes-boton-secundario" onClick={exportarCsv} disabled={!reporte}>
                    <FileSpreadsheet size={16} aria-hidden="true" /> Exportar CSV
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
                Envía una copia de este reporte al correo que indiques cuando lo necesites.
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
                            <CambioMensual porcentaje={porcentajeCambio(reporte.ingresos.total, reporteAnterior?.ingresos)} />
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
                            <CambioMensual porcentaje={porcentajeCambio(reporte.balance.utilidad, reporteAnterior?.utilidad)} />
                        </div>
                    </div>

                    <section className="reportes-visualizaciones" aria-label="Visualizaciones del período">
                        <div className="reportes-grafica reportes-grafica-tendencia">
                            <div className="reportes-grafica-cabecera">
                                <div><span className="reportes-section-kicker">EVOLUCIÓN</span><h3>Últimos 6 meses</h3></div>
                                <div className="reportes-grafica-opciones" role="group" aria-label="Métricas de tendencia">
                                    <button type="button" className={vistaTendencia === 'ingresos-utilidad' ? 'activo' : ''} onClick={() => setVistaTendencia('ingresos-utilidad')}>Ingresos y utilidad</button>
                                    <button type="button" className={vistaTendencia === 'ingresos-egresos' ? 'activo' : ''} onClick={() => setVistaTendencia('ingresos-egresos')}>Ingresos y compras</button>
                                    <button type="button" className={vistaTendencia === 'utilidad' ? 'activo' : ''} onClick={() => setVistaTendencia('utilidad')}>Utilidad</button>
                                </div>
                                <span className="reportes-grafica-leyenda"><i /> {vistaTendencia === 'utilidad' ? 'Utilidad' : 'Ingresos'} {vistaTendencia !== 'utilidad' && <><i className={vistaTendencia === 'ingresos-egresos' ? 'leyenda-egresos' : 'leyenda-utilidad'} /> {vistaTendencia === 'ingresos-egresos' ? 'Compras' : 'Utilidad'}</>}</span>
                            </div>
                            {tendencia.length ? <div className="reportes-barras" role="img" aria-label={`Tendencia de ${vistaTendencia.replace('-', ' y ')} durante los últimos meses`}>
                                {tendencia.map((item) => {
                                    const series = vistaTendencia === 'ingresos-egresos' ? ['ingresos', 'egresos'] : vistaTendencia === 'utilidad' ? ['utilidad'] : ['ingresos', 'utilidad'];
                                    const maximo = Math.max(...tendencia.flatMap((fila) => series.map((clave) => Number(fila[clave]) || 0)), 1);
                                    return <div className="reportes-mes-barra" key={`${item.anio}-${item.mes}`}>
                                        <div className="reportes-par-barras">
                                            {series.map((clave) => <span key={clave} className={`barra-${clave}`} style={{ height: `${Math.max(4, (Number(item[clave]) / maximo) * 100)}%` }} title={`${clave}: ${cop(item[clave])}`} />)}
                                        </div><small>{item.nombre_mes.slice(0, 3)} '{String(item.anio).slice(-2)}</small>
                                    </div>;
                                })}
                            </div> : <p className="admin-vacio">Aún no hay historial suficiente para mostrar tendencias.</p>}
                        </div>

                        <div className="reportes-grafica reportes-grafica-citas">
                            <div className="reportes-grafica-cabecera"><div><span className="reportes-section-kicker">ACTIVIDAD</span><h3>Estado de las citas</h3></div></div>
                            {totalEstadoCitas ? <div className="reportes-donut-contenido">
                                <div className="reportes-donut" style={{ background: `conic-gradient(${gradienteCitas})` }} role="img" aria-label={`Distribución de ${totalEstadoCitas} citas`}><strong>{totalEstadoCitas}<small>citas</small></strong></div>
                                <ul className="reportes-leyenda-estados">{estadoCitas.map(([nombre, cantidad], indice) => <li key={nombre}><i style={{ backgroundColor: coloresCitas[indice % coloresCitas.length] }} /><span>{nombre.replaceAll('_', ' ')}</span><strong>{cantidad}</strong></li>)}</ul>
                            </div> : <p className="admin-vacio">Sin citas registradas en este período.</p>}
                        </div>
                    </section>

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

                    <div className="reportes-indicadores-citas">
                        <div><span>Finalización de citas</span><strong>{porcentajeFinalizacion.toFixed(0)}%</strong><div className="reportes-progreso"><i style={{ width: `${porcentajeFinalizacion}%` }} /></div><small>{citasFinalizadas} de {totalEstadoCitas} citas</small></div>
                        <div><span>Ticket promedio por cita finalizada</span><strong>{cop(ticketPromedio)}</strong><small>Ingresos del período ÷ citas finalizadas</small></div>
                        <div><span>Citas canceladas</span><strong>{citasCanceladas}</strong><small>{totalEstadoCitas ? `${((citasCanceladas / totalEstadoCitas) * 100).toFixed(0)}% del total registrado` : 'Sin citas en el período'}</small></div>
                    </div>

                    <div className="reportes-ranking-toolbar">
                        <div><span className="reportes-section-kicker">DETALLE</span><h3>Rankings del período</h3></div>
                        <label className="reportes-busqueda"><Search size={16} aria-hidden="true" /><input aria-label="Filtrar rankings" placeholder="Filtrar clientes, empleados, servicios o productos" value={buscarRankings} onChange={(event) => setBuscarRankings(event.target.value)} /></label>
                    </div>
                    <div className="reportes-listas">
                        <TablaTop
                            icono={<Users size={17} />}
                            titulo="Top clientes"
                            columnas={['Cliente', 'Citas', 'Gastado']}
                            filas={filtrarRanking(reporte.top_clientes).map((c) => [c.nombre, c.citas_finalizadas, cop(c.total_gastado)])}
                        />
                        <TablaTop
                            icono={<Users size={17} />}
                            titulo="Top empleados"
                            columnas={['Empleado', 'Citas', 'Facturado']}
                            filas={filtrarRanking(reporte.top_empleados).map((e) => [e.nombre, e.solicitudes, cop(e.facturado)])}
                        />
                        <TablaTop
                            icono={<Scissors size={17} />}
                            titulo="Servicios más pedidos"
                            columnas={['Servicio', 'Citas', 'Facturado']}
                            filas={filtrarRanking(reporte.top_servicios).map((s) => [s.nombre, s.solicitudes, cop(s.facturado)])}
                        />
                        <TablaTop
                            icono={<Package size={17} />}
                            titulo="Productos más comprados"
                            columnas={['Producto', 'Unidades', 'Gasto']}
                            filas={filtrarRanking(reporte.compras.top_productos).map((p) => [p.nombre, p.unidades, cop(p.gasto)])}
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
                    <div className="reportes-historial-cabecera"><div><span className="reportes-section-kicker">CONSULTAS ANTERIORES</span><h3>Historial de reportes</h3></div><label className="reportes-busqueda"><Search size={16} aria-hidden="true" /><input aria-label="Buscar en historial" placeholder="Buscar mes, cliente o empleado" value={buscarHistorial} onChange={(event) => setBuscarHistorial(event.target.value)} />{buscarHistorial && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBuscarHistorial('')}><X size={15} /></button>}</label></div>
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
                                {historialFiltrado.map((h) => (
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
                    {historialFiltrado.length === 0 && <p className="admin-vacio">No hay reportes que coincidan con “{buscarHistorial}”.</p>}
                </div>
            )}
        </section>
    );
}

function CambioMensual({ porcentaje }) {
    if (porcentaje === null || porcentaje === undefined || !Number.isFinite(porcentaje)) {
        return <span className="reportes-cambio reportes-cambio-neutro"><TrendingUp size={14} aria-hidden="true" /> Sin comparación anterior</span>;
    }
    const subio = porcentaje >= 0;
    return <span className={`reportes-cambio ${subio ? 'reportes-cambio-subio' : 'reportes-cambio-bajo'}`}><TrendingUp size={14} aria-hidden="true" /> {subio ? '+' : ''}{porcentaje.toFixed(1)}% vs. mes anterior</span>;
}

function TablaTop({ titulo, columnas, filas, icono }) {
    return (
        <div className="reportes-lista">
            <h3>{icono && <span className="reportes-lista-icono">{icono}</span>}{titulo}</h3>
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
