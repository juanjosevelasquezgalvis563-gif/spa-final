
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { enviarEmailGmail, gmailApiConfigurado } from "../utils/gmailApi.js";

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
            ? req.body.email.trim().toLowerCase()
            : "";

        if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido"
            });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL?.replace(/\/+$/, "");

        if (!gmailApiConfigurado() || !FRONTEND_URL) {
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

      
        const token = crypto.randomBytes(32).toString("hex");

        const expiraEn = new Date(
            Date.now() + MINUTOS_EXPIRACION * 60 * 1000
        );

      
        const recuperacion = await PasswordReset.create({
            usuario_id: usuario.id,
            token,
            expires_at: expiraEn
        });

       
        const enlace =
            `${FRONTEND_URL}/reset-password/${token}`;

       
        await enviarEmailGmail({
            to: usuario.email,
            subject: "Recuperación de contraseña",
            fromName: "JC Alta Peluquería",
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
