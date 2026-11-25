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

const NOMBRES_MES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const pad = (n) => String(n).padStart(2, "0");
const num = (valor) => Number(valor) || 0;

export function periodoActual() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit"
    }).formatToParts(new Date());

    return {
        anio: Number(partes.find((p) => p.type === "year").value),
        mes: Number(partes.find((p) => p.type === "month").value)
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
    const sigAnio = mes === 12 ? anio + 1 : anio;
    const sigMes = mes === 12 ? 1 : mes + 1;

    return {
        inicio: new Date(Date.UTC(anio, mes - 1, 1, OFFSET_HORAS)),
        fin: new Date(Date.UTC(sigAnio, sigMes - 1, 1, OFFSET_HORAS)),
        inicioStr: `${anio}-${pad(mes)}-01`,
        finStr: `${sigAnio}-${pad(sigMes)}-01`
    };
}


async function nombresPorId(Modelo, ids) {
    if (!ids.length) return new Map();
    const filas = await Modelo.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ["id", "nombre"],
        raw: true
    });
    return new Map(filas.map((f) => [f.id, f.nombre]));
}

function pagosEnModoPruebas() {
    const simulados = process.env.PAGOS_SIMULADOS === "true" && process.env.NODE_ENV !== "production";
    const llavePrueba = String(process.env.WOMPI_PUBLIC_KEY || "").startsWith("pub_test_");
    return simulados || llavePrueba;
}


async function rankingCitas(campo, Modelo, rangoFecha) {
    const filas = await Cita.findAll({
        attributes: [
            campo,
            [fn("COUNT", col("id")), "solicitudes"],
            [literal("SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END)"), "finalizadas"],
            [fn("COALESCE", fn("SUM", literal("CASE WHEN estado = 'finalizada' THEN precio_final ELSE 0 END")), 0), "facturado"]
        ],
        where: { estado: { [Op.ne]: "cancelada" }, fecha: rangoFecha },
        group: [campo],
        order: [[literal("solicitudes"), "DESC"], [literal("finalizadas"), "DESC"]],
        limit: LIMITE_TOP,
        raw: true
    });

    const nombres = await nombresPorId(Modelo, filas.map((f) => f[campo]));

    return filas.map((f) => ({
        id: f[campo],
        nombre: nombres.get(f[campo]) || "Desconocido",
        solicitudes: num(f.solicitudes),
        finalizadas: num(f.finalizadas),
        facturado: num(f.facturado)
    }));
}



export async function generarDatosReporte(anio, mes) {
    const { inicio, fin, inicioStr, finStr } = limitesDelMes(anio, mes);
    const rangoDateTime = { [Op.gte]: inicio, [Op.lt]: fin };
    const rangoFecha = { [Op.gte]: inicioStr, [Op.lt]: finStr };
    const totalCompraExpr = literal("COALESCE(total, precio_compra * cantidad)");

    const [
        pagosPeriodo,
        reservasPeriodo,
        [resumenCompras],
        topProductosRaw,
        citasPorEstado,
        topClientesRaw,
        topEmpleados,
        topServicios
    ] = await Promise.all([
       
        Pago.findAll({
            attributes: ["id", "cita_id", "total_pago", "monto_online", "monto_local"],
            where: { estado_pago: "pagada", fecha_pago: rangoDateTime },
            raw: true
        }),
      
        PagoReserva.findAll({
            attributes: ["estado", "cita_id", "monto_pagado", "updated_at"],
            where: {
                estado: { [Op.in]: ["aprobado", "aprobado_abono"] },
                updated_at: rangoDateTime
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
                "usuario_id",
                [fn("COUNT", col("id")), "citas"],
                [fn("COALESCE", fn("SUM", col("precio_final")), 0), "gastado"]
            ],
            where: { estado: "finalizada", fecha: rangoFecha },
            group: ["usuario_id"],
            order: [[literal("citas"), "DESC"], [literal("gastado"), "DESC"]],
            limit: LIMITE_TOP,
            raw: true
        }),
       
        rankingCitas("empleado_id", Usuario, rangoFecha),
        rankingCitas("servicio_id", Servicio, rangoFecha)
    ]);

   
    const movimientosNormalizados = pagosPeriodo.map((pago) => {
        let online = num(pago.monto_online);
        let local = num(pago.monto_local);
        if (online === 0 && local === 0) local = num(pago.total_pago);
        return { ...pago, online, local };
    });
    const citasConPagoOnline = new Set(movimientosNormalizados
        .filter((pago) => pago.online > 0 && pago.cita_id != null)
        .map((pago) => Number(pago.cita_id)));
    const ingresosOnline = movimientosNormalizados.reduce((suma, pago) => suma + pago.online, 0);
    const ingresosLocal = movimientosNormalizados.reduce((suma, pago) => suma + pago.local, 0);
    const pagosReservaSinMovimiento = reservasPeriodo.filter((reserva) =>
        (reserva.cita_id == null || !citasConPagoOnline.has(Number(reserva.cita_id)))
        && num(reserva.monto_pagado) > 0
    );
    const onlineHistorico = pagosReservaSinMovimiento.reduce((suma, reserva) => suma + num(reserva.monto_pagado), 0);
    const reservas = { total: onlineHistorico, cantidad: pagosReservaSinMovimiento.length, por_estado: {} };
    for (const reserva of pagosReservaSinMovimiento) {
        const actual = reservas.por_estado[reserva.estado] || { cantidad: 0, total: 0 };
        actual.cantidad += 1;
        actual.total += num(reserva.monto_pagado);
        reservas.por_estado[reserva.estado] = actual;
    }
    const totalOnline = ingresosOnline + onlineHistorico;
    const totalLocal = ingresosLocal;
    const ingresosTotal = totalOnline + totalLocal;

   
    const nombresProductos = await nombresPorId(Producto, topProductosRaw.map((p) => p.producto_id));
    const compras = {
        total: num(resumenCompras?.total),
        cantidad_compras: num(resumenCompras?.cantidad),
        unidades: num(resumenCompras?.unidades),
        top_productos: topProductosRaw.map((p) => ({
            id: p.producto_id,
            nombre: nombresProductos.get(p.producto_id) || "Desconocido",
            unidades: num(p.unidades),
            gasto: num(p.gasto)
        }))
    };

  
    const porEstado = {};
    let totalCitas = 0;
    for (const fila of citasPorEstado) {
        porEstado[fila.estado] = num(fila.cantidad);
        totalCitas += num(fila.cantidad);
    }

  
    const nombresClientes = await nombresPorId(Usuario, topClientesRaw.map((c) => c.usuario_id));
    const topClientes = topClientesRaw.map((c) => ({
        id: c.usuario_id,
        nombre: nombresClientes.get(c.usuario_id) || "Desconocido",
        citas_finalizadas: num(c.citas),
        total_gastado: num(c.gastado)
    }));

    return {
        periodo: {
            anio,
            mes,
            nombre_mes: NOMBRES_MES[mes - 1],
            desde: inicioStr,
            hasta_exclusivo: finStr
        },
        ingresos: {
            online: { total: totalOnline, cantidad: movimientosNormalizados.filter((p) => p.online > 0).length + reservas.cantidad },
            local: { total: totalLocal, cantidad: movimientosNormalizados.filter((p) => p.local > 0).length },
            saldo_salon: { total: totalLocal, cantidad: movimientosNormalizados.filter((p) => p.local > 0).length },
            reservas_wompi: reservas,
            total: ingresosTotal
        },
        
        compras,
        balance: {
            ingresos: ingresosTotal,
            egresos: compras.total,
            utilidad: ingresosTotal - compras.total
        },
        citas: { total: totalCitas, por_estado: porEstado },
        cliente_mas_fiel: topClientes[0] || null,
        top_clientes: topClientes,
        empleado_mas_solicitado: topEmpleados[0] || null,
        top_empleados: topEmpleados,
        top_servicios: topServicios,
        meta: {
            moneda: "COP",
            generado_en: new Date().toISOString(),
            modo_pruebas: pagosEnModoPruebas(),
            nota_ingresos:
                "Ingresos = pagos online y locales confirmados. Una reserva se excluye cuando ya tiene " +
                "un movimiento online asociado, para evitar duplicarla."
        }
    };
}


 
export async function guardarReporte(anio, mes, { forzar = false } = {}) {
    const existente = await ReporteMensual.findOne({ where: { anio, mes } });
    if (existente && !forzar) return existente;

    const datos = await generarDatosReporte(anio, mes);

    if (existente) {
        existente.datos = datos;
        existente.generado_en = new Date();
        await existente.save();
        return existente;
    }

    
    const [reporte] = await ReporteMensual.findOrCreate({
        where: { anio, mes },
        defaults: { anio, mes, datos, generado_en: new Date() }
    });
    return reporte;
}

