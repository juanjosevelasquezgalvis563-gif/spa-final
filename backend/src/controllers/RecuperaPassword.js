import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import Usuario from "../models/Usuario.js";
import PasswordReset from "../models/password_resets.js";


const MINUTOS_EXPIRACION = 15;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARACTERES_ESPECIALES = "@#$%&*()_";

function validarPassword(password) {
    let tieneMayuscula = false;
    let tieneMinuscula = false;
    let tieneNumero = false;
    let tieneCaracterEspecial = false;

    for (let i = 0; i < password.length; i++) {
        if (password[i] >= "A" && password[i] <= "Z") {
            tieneMayuscula = true;
        } else if (password[i] >= "a" && password[i] <= "z") {
            tieneMinuscula = true;
        } else if (password[i] >= "0" && password[i] <= "9") {
            tieneNumero = true;
        } else if (CARACTERES_ESPECIALES.includes(password[i])) {
            tieneCaracterEspecial = true;
        }
    }

    if (!tieneMayuscula) {
        return "La contraseña debe tener al menos una mayúscula";
    }
    if (!tieneMinuscula) {
        return "La contraseña debe tener al menos una minúscula";
    }
    if (!tieneNumero) {
        return "La contraseña debe tener al menos un número";
    }
    if (!tieneCaracterEspecial) {
        return "La contraseña debe tener al menos un caracter especial";
    }
    if (password.length < 8) {
        return "La contraseña debe tener al menos 8 caracteres";
    }
    return null;
}





export async function forgotPassword(req, res) {
    try {
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim()
            : "";
        if (!email) {
            return res.status(400).json({
                message: "El correo es obligatorio"
            });
        }
        if (email.length > 254 || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido"
            });
        }

        const missingConfig = ["EMAIL_USER", "EMAIL_PASSWORD", "FRONTEND_URL"]
            .filter((name) => !process.env[name]?.trim());

        if (missingConfig.length) {
            console.error(
                "Configuración faltante para recuperar contraseña:",
                missingConfig.join(", ")
            );
            return res.status(503).json({
                message: "El servicio de recuperación no está configurado"
            });
        }

        const usuarios = await Usuario.findOne({
            attributes: ["id", "email"],
            where: { email }
        });

        if (!usuarios) {
            return res.status(404).json({
                message: "No existe un usuario con ese correo"
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiraEn = new Date(Date.now() + MINUTOS_EXPIRACION * 60 * 1000);
        const resetCreado = await PasswordReset.create({
            usuario_id: usuarios.id,
            token,
            expires_at: expiraEn
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const enlace =
            `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/reset-password/${token}`;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: usuarios.email,
                subject: "Recuperación de contraseña",
                html: `
                    <h2>Recuperar contraseña</h2>
                    <p>
                        Has solicitado recuperar la contraseña
                        de tu cuenta.
                    </p>
                    <p>
                        Haz clic en el siguiente botón:
                    </p>
                    <a
                        href="${enlace}"
                        style="
                            background:#000;
                            color:white;
                            padding:10px 20px;
                            text-decoration:none;
                            border-radius:5px;
                        "
                    >
                        Cambiar contraseña
                    </a>
                    <p>
                        Este enlace es válido durante 15 minutos.
                    </p>
                `
            });
        } catch (error) {
            await resetCreado.destroy();
            throw error;
        }

        try {
            await PasswordReset.destroy({
                where: {
                    usuario_id: usuarios.id,
                    token: { [Op.ne]: token }
                }
            });
        } catch (error) {
            console.error("No se pudieron eliminar enlaces anteriores:", error);
        }

        res.status(200).json({
            message:
                "Se ha enviado el enlace de recuperación a tu correo"
        });
    } catch (error) {
        console.error(
            "Error en forgotPassword:",
            error
        );

        res.status(500).json({

            message:
                "Error al enviar el enlace de recuperación"
        });
    }
}



export async function resetPassword(req, res) {

    try {

        const { token, nuevaPassword } = req.body ?? {};

        if (typeof token !== "string" || typeof nuevaPassword !== "string" || !token || !nuevaPassword) {

            return res.status(400).json({

                message:
                    "El token y la nueva contraseña son obligatorios"

            });

        }


        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({
                message: "El enlace es inválido o expiró"
            });
        }

        if (Buffer.byteLength(nuevaPassword, "utf8") > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 bytes"
            });
        }

        const errorPassword = validarPassword(nuevaPassword);
        if (errorPassword) {

            return res.status(400).json({

                message: errorPassword

            });

        }


        const recuperacion = await PasswordReset.findOne({
            where: {
                token: token,
                expires_at: {
                    [Op.gt]: new Date()
                }
            }
        });


      
        if (!recuperacion) {

            return res.status(400).json({

                message:
                    "El enlace es inválido o expiró"

            });

        }


        const passwordHash =
            await bcrypt.hash(
                nuevaPassword,
                10
            );


        await Usuario.update(
            {
                password: passwordHash
            },
            {
                where: {
                    id: recuperacion.usuario_id
                }
            }
        );


        await PasswordReset.destroy({
            where: {
                id: recuperacion.id
            }
        });


        res.status(200).json({

            message:
                "Contraseña actualizada correctamente"

        });


    } catch (error) {

        console.error(
            "Error en resetPassword:",
            error
        );

        res.status(500).json({

            message:
                "Error al cambiar la contraseña"

        });

    }

}