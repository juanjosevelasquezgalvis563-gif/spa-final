import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

import db from "../config/db.js";




export async function forgotPassword(req, res) {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "El correo es obligatorio"
            });
        }


        const [usuarios] = await db.promise().query(
            `SELECT id, email
             FROM usuarios
             WHERE email = ?`,
            [email]
        );


        if (usuarios.length === 0) {

            return res.status(404).json({
                message: "No existe un usuario con ese correo"
            });

        }


        const usuario = usuarios[0];


       
        const token = crypto
            .randomBytes(32)
            .toString("hex");


      
        await db.promise().query(
            `INSERT INTO password_resets
            (usuario_id, token, expires_at)
            VALUES (
                ?,
                ?,
                DATE_ADD(NOW(), INTERVAL 15 MINUTE)
            )`,
            [
                usuario.id,
                token
            ]
        );


     
        const transporter = nodemailer.createTransport({

            service: "gmail",

            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }

        });


       
        const enlace =
            `http://localhost:5173/reset-password/${token}`;


        await transporter.sendMail({

            from: process.env.EMAIL_USER,

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

        const {
            token,
            nuevaPassword
        } = req.body;


        if (!token || !nuevaPassword) {

            return res.status(400).json({

                message:
                    "El token y la nueva contraseña son obligatorios"

            });

        }


        const [tokens] = await db.promise().query(

            `SELECT
                id,
                usuario_id,
                token,
                expires_at
             FROM password_resets
             WHERE token = ?
             AND expires_at > NOW()
             LIMIT 1`,

            [token]

        );


        console.log(
            "Token recibido:",
            token
        );

        console.log(
            "Resultado token:",
            tokens
        );


        if (tokens.length === 0) {

            return res.status(400).json({

                message:
                    "El enlace es inválido o expiró"

            });

        }


        const recuperacion = tokens[0];


      
        const passwordHash =
            await bcrypt.hash(
                nuevaPassword,
                10
            );


        await db.promise().query(

            `UPDATE usuarios
             SET password = ?
             WHERE id = ?`,

            [
                passwordHash,
                recuperacion.usuario_id
            ]

        );


        
        await db.promise().query(

            `DELETE FROM password_resets
             WHERE id = ?`,

            [
                recuperacion.id
            ]

        );


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