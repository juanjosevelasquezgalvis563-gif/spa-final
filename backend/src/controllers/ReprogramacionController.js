import { Op } from "sequelize";
import db from "../config/db.js";
import Cita from "../models/citas.js";
import Reprogramacion from "../models/Reprogramacion.js";
import Servicio from "../models/servicios.js";
import Usuario from "../models/Usuario.js";
import PagoReserva from "../models/PagoReserva.js";
import { puedeRealizarServicio } from "../utils/servicios.js";
import { horarioAtencionValido, normalizarHoraReserva, validarFechaHoraReserva } from "../utils/fechaHora.js";
import { enviarAvisoReprogramacion, enviarPropuestaReprogramacion, enviarReprogramacionAceptada } from "../utils/correo.js";

const estadosOcupados = ["pendiente", "confirmada", "en_curso"];
const empleadoIdDe = (req) => Number(req.user?.empleadoActivoId || req.user?.id);

function minutoDelDia(hora) {
    const [h, m] = String(hora || "").split(":").map(Number);
    return h * 60 + m;
}

async function tieneCruce({ empleadoId, fecha, hora, excluirCitaId, transaction }) {
    const citas = await Cita.findAll({
        where: {
            empleado_id: empleadoId,
            fecha: { [Op.gte]: `${fecha} 00:00:00`, [Op.lt]: `${fecha} 23:59:59.999` },
            estado: { [Op.in]: estadosOcupados },
            ...(excluirCitaId ? { id: { [Op.ne]: excluirCitaId } } : {})
        },
        attributes: ["id", "hora"],
        transaction,
        lock: transaction?.LOCK?.UPDATE
    });
    const inicio = minutoDelDia(hora);
    const fin = inicio + 60; // La duración no está almacenada en el catálogo; se reserva el bloque horario de una hora.
    return citas.some((cita) => {
        const otroInicio = minutoDelDia(cita.hora);
        return inicio < otroInicio + 60 && otroInicio < fin;
    });
}

export async function solicitarReprogramacion(req, res) {
    try {
        const clienteId = Number(req.user.id);
        const citaId = Number(req.params.id);
        const { fecha, hora, empleado_id, servicio_id, mensaje = "" } = req.body || {};
        if (!horarioAtencionValido(hora)) {
            return res.status(400).json({ message: "El spa atiende de 8:00 a. m. a 6:00 p. m. Las citas duran una hora; la última debe iniciar a las 5:00 p. m." });
        }
        if (!validarFechaHoraReserva(fecha, hora) || !empleado_id || !servicio_id) {
            return res.status(400).json({ message: "Indica una fecha y hora válidas dentro del horario del spa." });
        }

        const creada = await db.transaction(async (transaction) => {
            const cita = await Cita.findOne({ where: { id: citaId, usuario_id: clienteId }, transaction, lock: transaction.LOCK.UPDATE });
            if (!cita) return { error: "Cita no encontrada.", status: 404 };
            if (["finalizada", "cancelada"].includes(cita.estado)) return { error: "Esta cita ya no se puede reprogramar.", status: 400 };

            if (Number(empleado_id) !== Number(cita.empleado_id)) {
                return { error: "La reprogramación debe conservar el empleado asignado a esta cita.", status: 400 };
            }
            const empleado = await Usuario.findOne({ where: { id: cita.empleado_id, rol: "empleado" }, transaction });
            const servicio = await Servicio.findByPk(servicio_id, { transaction });
            if (!empleado || !servicio) return { error: "Selecciona un empleado y servicio válidos.", status: 400 };
            if (!puedeRealizarServicio(empleado, servicio)) return { error: "El empleado seleccionado no realiza ese servicio.", status: 400 };
            const solicitudActiva = await Reprogramacion.findOne({ where: { cita_id: citaId, estado: "pendiente" }, transaction, lock: transaction.LOCK.UPDATE });
            if (solicitudActiva) return { error: "Ya hay una solicitud de reprogramación pendiente para esta cita.", status: 409 };
            await Reprogramacion.update(
                { estado: "rechazada" },
                { where: { cita_id: citaId, estado: "propuesta" }, transaction }
            );
            const reservaPagada = await PagoReserva.findOne({ where: { cita_id: cita.id, estado: "aprobado" }, transaction, lock: transaction.LOCK.UPDATE });
            if (reservaPagada && Number(cita.servicio_id) !== Number(servicio.id)) return { error: "Una cita con reserva pagada debe conservar el mismo servicio.", status: 400 };
            const horaNormalizada = normalizarHoraReserva(hora);
            if (await tieneCruce({ empleadoId: empleado.id, fecha, hora: horaNormalizada, excluirCitaId: cita.id, transaction })) {
                return { error: "Ese horario se cruza con otra cita del empleado. Elige otra hora.", status: 409 };
            }
            const solicitud = await Reprogramacion.create({
                cita_id: cita.id, cliente_id: clienteId, empleado_id: empleado.id,
                fecha_solicitada: fecha, hora_solicitada: horaNormalizada,
                servicio_id: servicio.id,
                mensaje: typeof mensaje === "string" ? mensaje.trim().slice(0, 1000) : ""
            }, { transaction });
            return { solicitud, empleado, servicio, cita };
        });
        if (creada.error) return res.status(creada.status).json({ message: creada.error });
        const correoEnviado = await enviarAvisoReprogramacion({ email: creada.empleado.email, nombreEmpleado: creada.empleado.nombre, nombreCliente: req.user.nombre, servicio: creada.servicio.nombre, fecha, hora, mensaje });
        return res.status(201).json({ message: correoEnviado
            ? "Solicitud enviada al empleado. La cita conservará su horario hasta que la revise."
            : "La solicitud quedó guardada para el empleado, pero no se pudo enviar el correo. La cita conserva su horario actual.", solicitud: creada.solicitud });
    } catch (error) {
        console.error("Error al solicitar reprogramación:", error);
        return res.status(500).json({ message: "No se pudo enviar la solicitud de reprogramación." });
    }
}

export async function listarReprogramacionesEmpleado(req, res) {
    try {
        const solicitudes = await Reprogramacion.findAll({ where: { empleado_id: empleadoIdDe(req), estado: { [Op.in]: ["pendiente", "propuesta"] } }, order: [["created_at", "DESC"]], raw: true });
        const idsClientes = [...new Set(solicitudes.map((s) => s.cliente_id))];
        const idsServicios = [...new Set(solicitudes.map((s) => s.servicio_id))];
        const [clientes, servicios] = await Promise.all([
            idsClientes.length ? Usuario.findAll({ where: { id: idsClientes }, attributes: ["id", "nombre", "email"] }) : [],
            idsServicios.length ? Servicio.findAll({ where: { id: idsServicios }, attributes: ["id", "nombre"] }) : []
        ]);
        const clienteMap = new Map(clientes.map((x) => [Number(x.id), x]));
        const servicioMap = new Map(servicios.map((x) => [Number(x.id), x.nombre]));
        return res.json(solicitudes.map((s) => ({ ...s, cliente: clienteMap.get(Number(s.cliente_id)), servicio: servicioMap.get(Number(s.servicio_id)) })));
    } catch (error) {
        console.error("Error al obtener solicitudes de reprogramación:", error);
        return res.status(500).json({ message: "No se pudieron obtener las solicitudes." });
    }
}

export async function aceptarReprogramacion(req, res) {
    try {
        const resultado = await db.transaction(async (transaction) => {
            const solicitud = await Reprogramacion.findOne({ where: { id: req.params.id, empleado_id: empleadoIdDe(req), estado: "pendiente" }, transaction, lock: transaction.LOCK.UPDATE });
            if (!solicitud) return { error: "La solicitud ya no está pendiente o no pertenece a este empleado.", status: 404 };
            const cita = await Cita.findByPk(solicitud.cita_id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!cita || ["finalizada", "cancelada"].includes(cita.estado)) return { error: "La cita ya no se puede modificar.", status: 409 };
            const reservaPagada = await PagoReserva.findOne({ where: { cita_id: cita.id, estado: "aprobado" }, transaction, lock: transaction.LOCK.UPDATE });
            if (reservaPagada && Number(cita.servicio_id) !== Number(solicitud.servicio_id)) return { error: "La cita tiene una reserva pagada y no puede cambiar de servicio.", status: 409 };
            const empleado = await Usuario.findByPk(solicitud.empleado_id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!empleado || empleado.rol !== "empleado") return { error: "No encontramos el empleado asignado a la solicitud.", status: 404 };
            if (await tieneCruce({ empleadoId: solicitud.empleado_id, fecha: solicitud.fecha_solicitada, hora: solicitud.hora_solicitada, excluirCitaId: cita.id, transaction })) return { error: "El horario ya fue ocupado. Propón otra hora al cliente.", status: 409 };
            cita.fecha = solicitud.fecha_solicitada;
            cita.hora = solicitud.hora_solicitada;
            cita.empleado_id = solicitud.empleado_id;
            cita.servicio_id = solicitud.servicio_id;
            cita.estado = "pendiente";
            await cita.save({ transaction });
            if (reservaPagada) {
                reservaPagada.fecha_reserva = solicitud.fecha_solicitada;
                reservaPagada.hora_reserva = solicitud.hora_solicitada;
                reservaPagada.empleado_id = solicitud.empleado_id;
                await reservaPagada.save({ transaction });
            }
            solicitud.estado = "aceptada";
            await solicitud.save({ transaction });
            const cliente = await Usuario.findByPk(solicitud.cliente_id, { transaction });
            const servicio = await Servicio.findByPk(solicitud.servicio_id, { transaction });
            return { ok: true, cliente, empleado, servicio, fecha: solicitud.fecha_solicitada, hora: solicitud.hora_solicitada };
        });
        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        await enviarReprogramacionAceptada({ email: resultado.cliente?.email, emailEmpleado: resultado.empleado?.email, nombreEmpleado: resultado.empleado?.nombre, nombreCliente: resultado.cliente?.nombre, servicio: resultado.servicio?.nombre, fecha: resultado.fecha, hora: resultado.hora });
        return res.json({ message: "Horario aceptado. La cita quedó pendiente de confirmación final." });
    } catch (error) {
        console.error("Error al aceptar reprogramación:", error);
        return res.status(500).json({ message: "No se pudo aceptar la solicitud." });
    }
}

export async function proponerReprogramacion(req, res) {
    try {
        const { mensaje } = req.body || {};
        const mensajeNormalizado = typeof mensaje === "string" ? mensaje.trim() : "";
        if (!mensajeNormalizado) {
            return res.status(400).json({ message: "Escribe una recomendacion para el cliente." });
        }
        if (mensajeNormalizado.length > 1000) {
            return res.status(400).json({ message: "El mensaje no puede superar los 1000 caracteres." });
        }

        const solicitud = await Reprogramacion.findOne({
            where: { id: req.params.id, empleado_id: empleadoIdDe(req), estado: "pendiente" }
        });
        if (!solicitud) {
            return res.status(404).json({ message: "La solicitud ya no esta pendiente o no pertenece a este empleado." });
        }

        const cita = await Cita.findByPk(solicitud.cita_id);
        const cliente = cita ? await Usuario.findByPk(solicitud.cliente_id) : null;
        const servicio = await Servicio.findByPk(solicitud.servicio_id);
        if (!cita || !cliente) {
            return res.status(404).json({ message: "No encontramos la cita o al cliente." });
        }

        solicitud.estado = "propuesta";
        solicitud.fecha_propuesta = null;
        solicitud.hora_propuesta = null;
        solicitud.mensaje = mensajeNormalizado;
        await solicitud.save();

        const correoEnviado = await enviarPropuestaReprogramacion({
            email: cliente.email,
            nombreCliente: cliente.nombre,
            servicio: servicio?.nombre,
            mensaje: mensajeNormalizado
        });
        return res.json({
            message: correoEnviado
                ? "Recomendacion enviada al cliente por correo. La cita conserva su horario actual."
                : "La recomendacion quedo guardada, pero no se pudo enviar el correo. La cita conserva su horario actual."
        });
    } catch (error) {
        console.error("Error al enviar recomendacion de reprogramacion:", error);
        return res.status(500).json({ message: "No se pudo enviar la recomendacion." });
    }
}
export async function aceptarPropuestaCliente(req, res) {
    try {
        const resultado = await db.transaction(async (transaction) => {
            const solicitud = await Reprogramacion.findOne({ where: { id: req.params.id, cliente_id: req.user.id, estado: "propuesta" }, transaction, lock: transaction.LOCK.UPDATE });
            if (!solicitud) return { error: "No tienes una propuesta pendiente para aceptar.", status: 404 };
            if (!solicitud.fecha_propuesta || !solicitud.hora_propuesta) return { error: "El empleado envio una recomendacion. Elige un nuevo horario y solicita el cambio otra vez.", status: 409 };
            const cita = await Cita.findOne({ where: { id: solicitud.cita_id, usuario_id: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
            if (!cita || ["finalizada", "cancelada"].includes(cita.estado)) return { error: "La cita ya no se puede modificar.", status: 409 };
            const reservaPagada = await PagoReserva.findOne({ where: { cita_id: cita.id, estado: "aprobado" }, transaction, lock: transaction.LOCK.UPDATE });
            if (reservaPagada && Number(cita.servicio_id) !== Number(solicitud.servicio_id)) return { error: "La cita tiene una reserva pagada y no puede cambiar de servicio.", status: 409 };
            const empleado = await Usuario.findByPk(solicitud.empleado_id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!empleado || empleado.rol !== "empleado") return { error: "No encontramos el empleado asignado a la solicitud.", status: 404 };
            if (await tieneCruce({ empleadoId: solicitud.empleado_id, fecha: solicitud.fecha_propuesta, hora: solicitud.hora_propuesta, excluirCitaId: cita.id, transaction })) return { error: "La hora propuesta ya fue ocupada. Pide otra opción al empleado.", status: 409 };
            cita.fecha = solicitud.fecha_propuesta;
            cita.hora = solicitud.hora_propuesta;
            cita.empleado_id = solicitud.empleado_id;
            cita.servicio_id = solicitud.servicio_id;
            cita.estado = "pendiente";
            await cita.save({ transaction });
            if (reservaPagada) {
                reservaPagada.fecha_reserva = solicitud.fecha_propuesta;
                reservaPagada.hora_reserva = solicitud.hora_propuesta;
                reservaPagada.empleado_id = solicitud.empleado_id;
                await reservaPagada.save({ transaction });
            }
            solicitud.estado = "aceptada";
            await solicitud.save({ transaction });
            const cliente = await Usuario.findByPk(solicitud.cliente_id, { transaction });
            const servicio = await Servicio.findByPk(solicitud.servicio_id, { transaction });
            return { ok: true, cliente, empleado, servicio, fecha: solicitud.fecha_propuesta, hora: solicitud.hora_propuesta };
        });
        if (resultado.error) return res.status(resultado.status).json({ message: resultado.error });
        await enviarReprogramacionAceptada({ email: resultado.cliente?.email, emailEmpleado: resultado.empleado?.email, nombreEmpleado: resultado.empleado?.nombre, nombreCliente: resultado.cliente?.nombre, servicio: resultado.servicio?.nombre, fecha: resultado.fecha, hora: resultado.hora });
        return res.json({ message: "Propuesta aceptada. La cita quedó pendiente de confirmación final del empleado." });
    } catch (error) {
        console.error("Error al aceptar propuesta de cita:", error);
        return res.status(500).json({ message: "No se pudo aceptar la propuesta." });
    }
}

export async function listarPropuestasCliente(req, res) {
    try {
        const solicitudes = await Reprogramacion.findAll({ where: { cliente_id: req.user.id, estado: "propuesta" }, order: [["created_at", "DESC"]], raw: true });
        return res.json(solicitudes);
    } catch (error) {
        console.error("Error al consultar propuestas de citas:", error);
        return res.status(500).json({ message: "No se pudieron consultar las propuestas." });
    }
}

