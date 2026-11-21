
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { Op } from "sequelize";

import Usuario from "../models/Usuario.js";
import PasswordReset from "../models/password_resets.js";

const MINUTOS_EXPIRACION = 15;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARACTERES_ESPECIALES = "@#$%&*()_";

// ==========================================
// VALIDAR CONTRASEÑA
// ==========================================

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

// ==========================================
// FUNCIÓN 1: RECUPERAR CONTRASEÑA
// ==========================================

export async function forgotPassword(req, res) {
    try {
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido"
            });
        }

        const EMAIL_USER = process.env.EMAIL_USER?.trim();
        const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD?.replace(/\s/g, "");
        const FRONTEND_URL = process.env.FRONTEND_URL?.replace(/\/+$/, "");

        if (!EMAIL_USER || !EMAIL_PASSWORD || !FRONTEND_URL) {
            console.error("Faltan variables de entorno para recuperación");

            return res.status(503).json({
                message: "El servicio de recuperación no está configurado"
            });
        }

        const usuario = await Usuario.findOne({
            attributes: ["id", "email"],
            where: { email }
        });

        if (!usuario) {
            return res.status(404).json({
                message: "No existe un usuario con ese correo"
            });
        }

        // Generar token seguro
        const token = crypto.randomBytes(32).toString("hex");

        const expiraEn = new Date(
            Date.now() + MINUTOS_EXPIRACION * 60 * 1000
        );

        // Guardar token en la base de datos
        const recuperacion = await PasswordReset.create({
            usuario_id: usuario.id,
            token,
            expires_at: expiraEn
        });

        // Configurar Gmail
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        });

        // Crear enlace
        const enlace =
            `${FRONTEND_URL}/reset-password/${token}`;

        // Enviar correo
        const resultado = await transporter.sendMail({
            from: `"JC Alta Peluquería" <${EMAIL_USER}>`,
            to: usuario.email,
            subject: "Recuperación de contraseña",
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;">
                    <h2>Recuperar contraseña</h2>

                    <p>
                        Has solicitado recuperar la contraseña
                        de tu cuenta.
                    </p>

                    <p>
                        Haz clic en el siguiente botón para crear
                        una nueva contraseña:
                    </p>

                    <a
                        href="${enlace}"
                        style="
                            display:inline-block;
                            background:#000;
                            color:#fff;
                            padding:12px 24px;
                            text-decoration:none;
                            border-radius:5px;
                        "
                    >
                        Cambiar contraseña
                    </a>

                    <p>
                        Este enlace es válido durante 15 minutos.
                    </p>

                    <p>
                        Si no solicitaste este cambio,
                        puedes ignorar este mensaje.
                    </p>
                </div>
            `
        });

        console.log(
            "Correo aceptado por SMTP:",
            resultado.messageId
        );

        // Eliminar tokens anteriores después del envío exitoso
        await PasswordReset.destroy({
            where: {
                usuario_id: usuario.id,
                token: { [Op.ne]: token }
            }
        });

        return res.status(200).json({
            message: "Se ha enviado el enlace de recuperación a tu correo"
        });

    } catch (error) {
        console.error("ERROR EN RECUPERACIÓN:", {
            message: error.message,
            code: error.code,
            response: error.response,
            responseCode: error.responseCode,
            command: error.command
        });

        return res.status(500).json({
            message: "Error al enviar el enlace de recuperación"
        });
    }
}

// ==========================================
// FUNCIÓN 2: RESTABLECER CONTRASEÑA
// ==========================================

export async function resetPassword(req, res) {
    try {
        const { token, nuevaPassword } = req.body ?? {};

        if (
            typeof token !== "string" ||
            typeof nuevaPassword !== "string" ||
            !token ||
            !nuevaPassword
        ) {
            return res.status(400).json({
                message: "El token y la nueva contraseña son obligatorios"
            });
        }

        // Validar formato del token
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({
                message: "El enlace es inválido o expiró"
            });
        }

        // Validar longitud máxima compatible con bcrypt
        if (Buffer.byteLength(nuevaPassword, "utf8") > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 bytes"
            });
        }

        // Validar requisitos de contraseña
        const errorPassword = validarPassword(nuevaPassword);

        if (errorPassword) {
            return res.status(400).json({
                message: errorPassword
            });
        }

        // Buscar token vigente
        const recuperacion = await PasswordReset.findOne({
            where: {
                token,
                expires_at: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!recuperacion) {
            return res.status(400).json({
                message: "El enlace es inválido o expiró"
            });
        }

        // Generar hash de contraseña
        const passwordHash = await bcrypt.hash(
            nuevaPassword,
            10
        );

        // Actualizar contraseña
        const [actualizados] = await Usuario.update(
            {
                password: passwordHash
            },
            {
                where: {
                    id: recuperacion.usuario_id
                }
            }
        );

        if (actualizados === 0) {
            return res.status(404).json({
                message: "No se encontró el usuario"
            });
        }

        // Eliminar token utilizado
        await PasswordReset.destroy({
            where: {
                id: recuperacion.id
            }
        });

        return res.status(200).json({
            message: "Contraseña actualizada correctamente"
        });

    } catch (error) {
        console.error("ERROR EN RESET PASSWORD:", error);

        return res.status(500).json({
            message: "Error al cambiar la contraseña"
        });
    }
}
