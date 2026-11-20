
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
    let resetCreado = null;

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

        const missingConfig = [
            "EMAIL_USER",
            "EMAIL_PASSWORD",
            "FRONTEND_URL"
        ].filter((name) => !process.env[name]?.trim());

        if (missingConfig.length) {
            console.error(
                "Configuración faltante:",
                missingConfig.join(", ")
            );

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

        const token = crypto.randomBytes(32).toString("hex");

        const expiraEn = new Date(
            Date.now() + MINUTOS_EXPIRACION * 60 * 1000
        );

        resetCreado = await PasswordReset.create({
            usuario_id: usuario.id,
            token,
            expires_at: expiraEn
        });

        // CONFIGURACIÓN DE GMAIL
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER.trim(),
                pass: process.env.EMAIL_PASSWORD.replace(/\s/g, "")
            }
        });

        // Verificar conexión con Gmail
        await transporter.verify();

        console.log("Gmail conectado correctamente");

        const enlace =
            `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/reset-password/${token}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER.trim(),
            to: usuario.email,
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

        // Eliminar enlaces anteriores del mismo usuario
        try {
            await PasswordReset.destroy({
                where: {
                    usuario_id: usuario.id,
                    token: { [Op.ne]: token }
                }
            });
        } catch (error) {
            console.error(
                "No se pudieron eliminar enlaces anteriores:",
                error
            );
        }

        return res.status(200).json({
            message: "Se ha enviado el enlace de recuperación a tu correo"
        });

    } catch (error) {
        console.error("ERROR EN RECUPERACIÓN:", {
            message: error.message,
            code: error.code,
            responseCode: error.responseCode,
            command: error.command
        });

        if (resetCreado) {
            await resetCreado.destroy().catch((deleteError) => {
                console.error(
                    "Error eliminando token:",
                    deleteError.message
                );
            });
        }

        return res.status(500).json({
            message: "Error al enviar el enlace de recuperación"
        });
    }
}

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

        const passwordHash = await bcrypt.hash(
            nuevaPassword,
            10
        );

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
