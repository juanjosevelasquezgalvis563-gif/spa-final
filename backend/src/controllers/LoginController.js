
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Usuario from "../models/Usuario.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios"
            });
        }

        const user = await Usuario.findOne({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        const valido = await bcrypt.compare(password, user.password);

        if (!valido) {
            return res.status(403).json({
                message: "Credenciales incorrectas"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });

        return res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
}

export async function me(req, res) {
    return res.json({
        user: req.user
    });
}

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

export async function loginGoogle(req, res) {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "No se recibió el token de Google"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({
                message: "El correo de Google no está verificado"
            });
        }

        const email = payload.email.toLowerCase();

        let user = await Usuario.findOne({
            where: { email }
        });

        if (!user) {
            const passwordAleatoria = crypto
                .randomBytes(32)
                .toString("hex");

            const passwordEncriptada = await bcrypt.hash(
                passwordAleatoria,
                10
            );

            user = await Usuario.create({
                nombre: payload.name || null,
                telefono: null,
                email,
                password: passwordEncriptada,
                rol: "cliente"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });

        return res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error("Error en loginGoogle:", error);

        return res.status(401).json({
            message: "No se pudo iniciar sesión con Google"
        });
    }
}