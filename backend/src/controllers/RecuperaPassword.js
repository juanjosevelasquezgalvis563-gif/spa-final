import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import Usuario from "../models/Usuario.js";
import PasswordReset from "../models/password_resets.js";


const MINUTOS_EXPIRACION = 15;





export async function forgotPassword(req, res) {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "El correo es obligatorio"
            });
        }


        const usuarios = await Usuario.findOne({
            attributes: ['id', 'email'],
            where: {
                email: email
            }
        });


        if (!usuarios) {

            return res.status(404).json({
                message: "No existe un usuario con ese correo"
            });

        }




       
        const token = crypto
            .randomBytes(32)
            .toString("hex");


      
        const expiraEn = new Date(
            Date.now() + MINUTOS_EXPIRACION * 60 * 1000
        );

        await PasswordReset.destroy({
            where: {
                usuario_id: usuarios.id
            }
        });

        await PasswordReset.create({
            usuario_id: usuarios.id,
            token: token,
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
            `${process.env.FRONTEND_URL}/reset-password/${token}`;


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


        if (nuevaPassword.length < 6) {

            return res.status(400).json({

                message:
                    "La contraseña debe tener mínimo 6 caracteres"

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