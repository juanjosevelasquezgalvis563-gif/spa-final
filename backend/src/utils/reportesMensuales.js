import { Op, fn, col, literal } from "sequelize";
import Pago from "../models/pagos.js";
import PagoReserva from "../models/PagoReserva.js";
import Compra from "../models/compras.js";
import Cita from "../models/citas.js";
import Producto from "../models/productos.js";
import Servicio from "../models/servicios.js";
import Usuario from "../models/Usuario.js";
import ReporteMensual from "../models/ReporteMensual.js";

const ZONA_HORARIA = process.env.REPORTES_TIMEZONE || "America/Bogota";
const OFFSET_HORAS = Number(process.env.REPORTES_UTC_OFFSET_HORAS ?? 5);
const LIMITE_TOP = 5;
export const VERSION_REPORTE = 2;

const NOMBRES_MES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const pad = (n) => String(n).padStart(2, "0");
const num = (valor) => Number(valor) || 0;
const dinero = (valor) => Math.round((num(valor) + Number.EPSILON) * 100) / 100;

export function periodoActual() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit"
    }).formatToParts(new Date());
    return {
        anio: Number(partes.find((parte) => parte.type === "year").value),
        mes: Number(partes.find((parte) => parte.type === "month").value)
    };
}

export function periodoAnterior() {
    const { anio, mes } = periodoActual();
    return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function compararPeriodos(a, b) {
    return (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes);
}

function limitesDelMes(anio, mes) {
    const siguienteAnio = mes === 12 ? anio + 1 : anio;
    const siguienteMes = mes === 12 ? 1 : mes + 1;
    return {
        inicio: new Date(Date.UTC(anio, mes - 1, 1, OFFSET_HORAS)),
        fin: new Date(Date.UTC(siguienteAnio, siguienteMes - 1, 1, OFFSET_HORAS)),
        inicioStr: `${anio}-${pad(mes)}-01`,
        finStr: `${siguienteAnio}-${pad(siguienteMes)}-01`
    };
}

async function nombresPorId(Modelo, ids) {
    const unicos = [...new Set(ids.filter((id) => id != null).map(Number))];
    if (!unicos.length) return new Map();
    const filas = await Modelo.findAll({
        where: { id: { [Op.in]: unicos } },
        attributes: ["id", "nombre"],
        raw: true
    });
    return new Map(filas.map((fila) => [Number(fila.id), fila.nombre]));
}

function pagosEnModoPruebas() {
    return (process.env.PAGOS_SIMULADOS === "true" && process.env.NODE_ENV !== "production")
        || String(process.env.WOMPI_PUBLIC_KEY || "").startsWith("pub_test_");
}

function montoRecibidoReserva(reserva) {
    const registrado = dinero(reserva.monto_pagado);
    if (registrado > 0) return registrado;
    if (reserva.estado === "aprobado") {
        return Math.max(0, dinero(num(reserva.monto_reserva) - num(reserva.monto_credito)));
    }
    return 0;
}

function estaEnPeriodo(fecha, inicio, fin) {
    const instante = new Date(fecha).getTime();
    return Number.isFinite(instante) && instante >= inicio.getTime() && instante < fin.getTime();
}

async function rankingCitas(campo, Modelo, rangoFecha) {
    const filas = await Cita.findAll({
        attributes: [
            campo,
            [fn("COUNT", col("id")), "solicitudes"],
            [literal("SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END)"), "finalizadas"]
        ],
        where: { estado: { [Op.ne]: "cancelada" }, fecha: rangoFecha },
        group: [campo],
        order: [[literal("solicitudes"), "DESC"], [literal("finalizadas"), "DESC"]],
        limit: LIMITE_TOP,
        raw: true
    });
    const nombres = await nombresPorId(Modelo, filas.map((fila) => fila[campo]));
    return filas.map((fila) => ({
        id: Number(fila[campo]),
        nombre: nombres.get(Number(fila[campo])) || "Desconocido",
        solicitudes: num(fila.solicitudes),
        finalizadas: num(fila.finalizadas)
    }));
}

function crearRecomendaciones({ ingresos, compras, citas, incompletos }) {
    const recomendaciones = [];
    const tasaCancelacion = citas.total ? citas.canceladas / citas.total : 0;
    const proporcionCompras = ingresos.total > 0 ? compras.total / ingresos.total : null;

    if (incompletos > 0) {
        recomendaciones.push({
            tipo: "revision",
            titulo: "Revisar registros de pago antiguos",
            detalle: `${incompletos} registro(s) no tienen el desglose de montos necesario para clasificarlos con seguridad. No se sumaron para evitar inflar los ingresos.`
        });
    }
    if (ingresos.total === 0 && compras.total > 0) {
        recomendaciones.push({
            tipo: "atencion",
            titulo: "Hubo compras sin ingresos registrados",
            detalle: "Comprueba que los pagos recibidos estén registrados y revisa si las compras corresponden a inventario planificado."
        });
    } else if (proporcionCompras !== null && proporcionCompras >= 0.6) {
        recomendaciones.push({
            tipo: "atencion",
            titulo: "Las compras pesan frente a los ingresos",
            detalle: `Las compras de inventario representan ${(proporcionCompras * 100).toFixed(0)}% de los ingresos recibidos del período. Revisa existencias y rotación antes de hacer nuevos pedidos.`
        });
    }
    if (citas.total >= 5 && tasaCancelacion >= 0.2) {
        recomendaciones.push({
            tipo: "sugerencia",
            titulo: "Revisar las cancelaciones",
            detalle: `${citas.canceladas} de ${citas.total} citas del período fueron canceladas. Identifica horarios o servicios con más cancelaciones y refuerza las confirmaciones.`
        });
    }
    if (citas.finalizadas > 0 && citas.total > 0 && citas.finalizadas / citas.total < 0.5) {
        recomendaciones.push({
            tipo: "sugerencia",
            titulo: "Dar seguimiento a las citas pendientes",
            detalle: `Se finalizaron ${citas.finalizadas} de ${citas.total} citas registradas durante el período. Revisa las citas aún pendientes o en curso antes de evaluar el desempeño del mes.`
        });
    }
    if (!recomendaciones.length) {
        recomendaciones.push({
            tipo: "positivo",
            titulo: "Sin alertas destacadas",
            detalle: "Continúa registrando cada pago y compra para mantener comparaciones mensuales completas."
        });
    }
    return recomendaciones;
}

export async function generarDatosReporte(anio, mes) {
    const { inicio, fin, inicioStr, finStr } = limitesDelMes(anio, mes);
    const rangoDateTime = { [Op.gte]: inicio, [Op.lt]: fin };
    const rangoFecha = { [Op.gte]: inicioStr, [Op.lt]: finStr };
    const totalCompraExpr = literal("COALESCE(NULLIF(total, 0), precio_compra * cantidad)");

    const [
        pagosPeriodo,
        reservasPeriodo,
        [resumenCompras],
        topProductosRaw,
        citasPorEstado,
        resumenFinalizadas,
        topClientesRaw,
        topEmpleados,
        topServicios
    ] = await Promise.all([
        Pago.findAll({
            attributes: ["id", "cita_id", "total_pago", "monto_online", "monto_local", "medio_pago"],
            where: { estado_pago: "pagada", fecha_pago: rangoDateTime },
            raw: true
        }),
        PagoReserva.findAll({
            attributes: ["id", "estado", "cita_id", "monto_pagado", "monto_reserva", "monto_credito", "updated_at"],
            where: {
                estado: { [Op.in]: ["aprobado", "aprobado_abono"] },
                [Op.or]: [{ updated_at: rangoDateTime }]
            },
            raw: true
        }),
        Compra.findAll({
            attributes: [
                [fn("COALESCE", fn("SUM", totalCompraExpr), 0), "total"],
                [fn("COUNT", col("id")), "cantidad"],
                [fn("COALESCE", fn("SUM", col("cantidad")), 0), "unidades"]
            ],
            where: { fecha: rangoDateTime },
            raw: true
        }),
        Compra.findAll({
            attributes: [
                "producto_id",
                [fn("SUM", col("cantidad")), "unidades"],
                [fn("SUM", totalCompraExpr), "gasto"]
            ],
            where: { fecha: rangoDateTime },
            group: ["producto_id"],
            order: [[literal("gasto"), "DESC"]],
            limit: LIMITE_TOP,
            raw: true
        }),
        Cita.findAll({
            attributes: ["estado", [fn("COUNT", col("id")), "cantidad"]],
            where: { fecha: rangoFecha },
            group: ["estado"],
            raw: true
        }),
        Cita.findAll({
            attributes: [
                [fn("COUNT", col("id")), "cantidad"],
                [fn("COALESCE", fn("SUM", col("precio_final")), 0), "valor"]
            ],
            where: { estado: "finalizada", fecha: rangoFecha },
            raw: true
        }),
        Cita.findAll({
            attributes: ["usuario_id", [fn("COUNT", col("id")), "citas"]],
            where: { estado: "finalizada", fecha: rangoFecha },
            group: ["usuario_id"],
            order: [[literal("citas"), "DESC"]],
            limit: LIMITE_TOP,
            raw: true
        }),
        rankingCitas("empleado_id", Usuario, rangoFecha),
        rankingCitas("servicio_id", Servicio, rangoFecha)
    ]);

    const idsCitasConPago = [...new Set(pagosPeriodo.map((pago) => Number(pago.cita_id)).filter(Boolean))];
    const reservasVinculadas = idsCitasConPago.length
        ? await PagoReserva.findAll({
            attributes: ["id", "estado", "cita_id", "monto_pagado", "monto_reserva", "monto_credito", "updated_at"],
            where: {
                cita_id: { [Op.in]: idsCitasConPago },
                estado: { [Op.in]: ["aprobado", "aprobado_abono"] }
            },
            raw: true
        })
        : [];

    const reservasPorId = new Map();
    for (const reserva of [...reservasPeriodo, ...reservasVinculadas]) {
        reservasPorId.set(Number(reserva.id), reserva);
    }
    const reservasRelacionadasConPago = new Set(
        [...reservasPorId.values()]
            .filter((reserva) => Number(reserva.cita_id) && montoRecibidoReserva(reserva) > 0)
            .map((reserva) => Number(reserva.cita_id))
    );

    let ingresosOnline = 0;
    let ingresosLocal = 0;
    let cantidadOnline = 0;
    let cantidadLocal = 0;
    let registrosIncompletos = 0;

    for (const reserva of reservasPorId.values()) {
        const monto = montoRecibidoReserva(reserva);
        if (monto <= 0 || !estaEnPeriodo(reserva.updated_at, inicio, fin)) continue;
        ingresosOnline += monto;
        cantidadOnline += 1;
    }

    for (const pago of pagosPeriodo) {
        let online = dinero(pago.monto_online);
        let local = dinero(pago.monto_local);
        if (online === 0 && local === 0) {
            if (pago.medio_pago === "online") online = dinero(pago.total_pago);
            else if (pago.medio_pago === "local") local = dinero(pago.total_pago);
            else {
                registrosIncompletos += 1;
                continue;
            }
        }

        if (online > 0 && !reservasRelacionadasConPago.has(Number(pago.cita_id))) {
            ingresosOnline += online;
            cantidadOnline += 1;
        }
        if (local > 0) {
            ingresosLocal += local;
            cantidadLocal += 1;
        }
    }

    ingresosOnline = dinero(ingresosOnline);
    ingresosLocal = dinero(ingresosLocal);
    const ingresosTotal = dinero(ingresosOnline + ingresosLocal);

    const nombresProductos = await nombresPorId(Producto, topProductosRaw.map((producto) => producto.producto_id));
    const compras = {
        total: dinero(resumenCompras?.total),
        cantidad_compras: num(resumenCompras?.cantidad),
        unidades: num(resumenCompras?.unidades),
        top_productos: topProductosRaw.map((producto) => ({
            id: Number(producto.producto_id),
            nombre: nombresProductos.get(Number(producto.producto_id)) || "Desconocido",
            unidades: num(producto.unidades),
            gasto: dinero(producto.gasto)
        }))
    };

    const porEstado = {};
    for (const fila of citasPorEstado) porEstado[fila.estado] = num(fila.cantidad);
    const totalCitas = Object.values(porEstado).reduce((total, cantidad) => total + cantidad, 0);
    const cantidadFinalizadas = num(resumenFinalizadas?.cantidad);
    const valorFinalizadas = dinero(resumenFinalizadas?.valor);
    const tasaCancelacion = totalCitas ? num(porEstado.cancelada) / totalCitas : 0;

    const nombresClientes = await nombresPorId(Usuario, topClientesRaw.map((cliente) => cliente.usuario_id));
    const topClientes = topClientesRaw.map((cliente) => ({
        id: Number(cliente.usuario_id),
        nombre: nombresClientes.get(Number(cliente.usuario_id)) || "Desconocido",
        citas_finalizadas: num(cliente.citas)
    }));

    const resultadoDespuesCompras = dinero(ingresosTotal - compras.total);
    const citas = {
        total: totalCitas,
        por_estado: porEstado,
        finalizadas: cantidadFinalizadas,
        canceladas: num(porEstado.cancelada),
        tasa_cancelacion: tasaCancelacion,
        valor_servicios_finalizados: valorFinalizadas,
        valor_promedio_servicio_finalizado: cantidadFinalizadas
            ? dinero(valorFinalizadas / cantidadFinalizadas)
            : 0
    };

    return {
        periodo: { anio, mes, nombre_mes: NOMBRES_MES[mes - 1], desde: inicioStr, hasta_exclusivo: finStr },
        ingresos: {
            online: { total: ingresosOnline, cantidad: cantidadOnline },
            local: { total: ingresosLocal, cantidad: cantidadLocal },
            total: ingresosTotal,
            registros_incompletos: registrosIncompletos
        },
        compras,
        balance: {
            ingresos: ingresosTotal,
            egresos: compras.total,
            resultado_despues_compras: resultadoDespuesCompras
        },
        citas,
        cliente_mas_fiel: topClientes[0] || null,
        top_clientes: topClientes,
        empleado_mas_solicitado: topEmpleados[0] || null,
        top_empleados: topEmpleados,
        top_servicios: topServicios,
        recomendaciones: crearRecomendaciones({
            ingresos: { total: ingresosTotal },
            compras,
            citas,
            incompletos: registrosIncompletos
        }),
        meta: {
            version: VERSION_REPORTE,
            moneda: "COP",
            generado_en: new Date().toISOString(),
            modo_pruebas: pagosEnModoPruebas(),
            base_ingresos: "Pagos efectivamente recibidos dentro del período, clasificados por fecha del movimiento online o local.",
            nota_resultado: "Ingresos recibidos menos compras registradas de inventario. No incluye otros gastos ni equivale a utilidad neta.",
            nota_periodos: "Los ingresos se agrupan por fecha de recepción; las citas y compras se agrupan por sus propias fechas."
        }
    };
}

export async function guardarReporte(anio, mes, { forzar = false } = {}) {
    const existente = await ReporteMensual.findOne({ where: { anio, mes } });
    if (existente && !forzar && Number(existente.datos?.meta?.version) === VERSION_REPORTE) {
        return existente;
    }

    const datos = await generarDatosReporte(anio, mes);
    return guardarDatosReporte(anio, mes, datos);
}

export async function guardarDatosReporte(anio, mes, datos) {
    const fechaGeneracion = new Date(datos?.meta?.generado_en || Date.now());
    const generadoEn = Number.isNaN(fechaGeneracion.getTime()) ? new Date() : fechaGeneracion;
    const existente = await ReporteMensual.findOne({ where: { anio, mes } });
    if (existente) {
        existente.datos = datos;
        existente.generado_en = generadoEn;
        await existente.save();
        return existente;
    }

    const [reporte] = await ReporteMensual.findOrCreate({
        where: { anio, mes },
        defaults: { anio, mes, datos, generado_en: generadoEn }
    });
    if (Number(reporte.datos?.meta?.version) !== Number(datos?.meta?.version) || reporte.datos?.meta?.generado_en !== datos?.meta?.generado_en) {
        reporte.datos = datos;
        reporte.generado_en = generadoEn;
        await reporte.save();
    }
    return reporte;
}

