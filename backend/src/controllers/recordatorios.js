import cron from "node-cron";
import nodemailer from "nodemailer";

import Cita from "../models/citas.js";
import Usuario from "../models/Usuario.js";
import RecordatorioCita from "../models/RecordatorioCita.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function procesarRecordatorios() {
    try {
        const citas = await Cita.findAll({
            where: {
                estado: "confirmada"
            }
        });

        for (const cita of citas) {
            try {
                const recordatorioExistente =
                    await RecordatorioCita.findOne({
                        where: {
                            cita_id: cita.id
                        }
                    });

                if (recordatorioExistente) {
                    continue;
                }

              
                const fechaTexto = String(cita.fecha).slice(0, 10);
                const horaTexto = String(cita.hora).slice(0, 8);

                const fechaCita = new Date(
                    `${fechaTexto}T${horaTexto}-05:00`
                );

                const ahora = new Date();

                const tiempoRestante =
                    fechaCita.getTime() - ahora.getTime();

                const veinticuatroHoras =
                    24 * 60 * 60 * 1000;

             
                if (
                    tiempoRestante <= 0 ||
                    tiempoRestante > veinticuatroHoras
                ) {
                    continue;
                }

                const cliente = await Usuario.findByPk(
                    cita.usuario_id
                );

                if (!cliente || !cliente.email) {
                    continue;
                }

                await transporter.sendMail({
                    from: `"VelureSpa" <${process.env.EMAIL_USER}>`,
                    to: cliente.email,
                    subject: "Recordatorio de tu cita - VelureSpa",
                    html: `
                        <h2>¡Hola, ${cliente.nombre || "cliente"}!</h2>

                        <p>Te recordamos que tienes una cita próxima
                        en VelureSpa.</p>

                        <p><strong>Fecha:</strong>
                        ${fechaCita.toLocaleDateString("es-CO")}</p>

                        <p><strong>Hora:</strong>
                        ${String(cita.hora).slice(0, 5)}</p>

                        <p>¡Te esperamos!</p>
                    `
                });

            
                await RecordatorioCita.create({
                    cita_id: cita.id,
                    enviado_en: new Date()
                });

                console.log(
                    `Recordatorio enviado para la cita ${cita.id}`
                );

            } catch (error) {
                console.error(
                    `Error en recordatorio de cita ${cita.id}:`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            "Error al consultar citas para recordatorios:",
            error
        );
    }
}

export function iniciarRecordatorios() {
  
    procesarRecordatorios();

   
    cron.schedule("* * * * *", procesarRecordatorios);
}