
import bcrypt from "bcrypt";
import Usuario from "../models/Usuario.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;


async function validarTurnstile(token) {
    if (!TURNSTILE_SECRET_KEY) {
        console.error("Turnstile: Falta TURNSTILE_SECRET_KEY.");
        return false;
    }

    if (!token) {
        return false;
    }

    try {
        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    secret: TURNSTILE_SECRET_KEY,
                    response: token
                })
            }
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json();

        if (!data.success) {
            console.error(
                "Turnstile: Verificación fallida.",
                data["error-codes"]
            );
        }

        return data.success === true;

    } catch (error) {
        console.error(
            "Error al validar Turnstile:",
            error.message
        );

        return false;
    }
}



export async function registro(req, res) {
    try {
        const {
            nombre,
            telefono,
            email,
            password,
            turnstileToken
        } = req.body ?? {};

    
        const turnstileOk = await validarTurnstile(turnstileToken);

        if (!turnstileOk) {
            return res.status(400).json({
                message: "Completa la verificación de seguridad antes de registrarte."
            });
        }

    
        if (
            typeof nombre !== "string" ||
            typeof telefono !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !nombre.trim() ||
            !telefono.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios."
            });
        }

        const nombreNormalizado = nombre.trim();
        const telefonoNormalizado = telefono.trim();
        const correoNormalizado = email.trim().toLowerCase();

      
        if (
            nombreNormalizado.length < 5 ||
            nombreNormalizado.length > 15
        ) {
            return res.status(400).json({
                message: "El nombre debe tener entre 5 y 15 caracteres."
            });
        }

      
        if (!/^\d{10}$/.test(telefonoNormalizado)) {
            return res.status(400).json({
                message: "El teléfono debe tener exactamente 10 dígitos."
            });
        }

      
        if (
            correoNormalizado.length > 254 ||
            !EMAIL_REGEX.test(correoNormalizado)
        ) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido."
            });
        }

        
        if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        if (Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 bytes."
            });
        }

      
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula."
            });
        }

        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula."
            });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número."
            });
        }

        if (!/[@#$%&*()_]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un carácter especial."
            });
        }

        const usuarioExistente = await Usuario.findOne({
            where: {
                email: correoNormalizado
            }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                message: "Este correo ya está registrado en el sistema."
            });
        }

        
        const passwordHash = await bcrypt.hash(password, 10);

        
        await Usuario.create({
            nombre: nombreNormalizado,
            telefono: telefonoNormalizado,
            email: correoNormalizado,
            password: passwordHash,
            rol: "cliente"
        });

       
        return res.status(201).json({
            message: "Usuario registrado exitosamente. Ya puedes iniciar sesión."
        });

    } catch (error) {
        console.error("Error al registrar el usuario:", error);

        return res.status(500).json({
            message: "No se pudo registrar el usuario en este momento."
        });
    }
}



export async function actualizarDatos(req, res) {
    try {
        const usuarioId = req.user.id;

        const { nombre, telefono, email, password } = req.body ?? {};

        if (
            typeof nombre !== "string" ||
            typeof telefono !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !nombre.trim() ||
            !telefono.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Para actualizar tus datos es obligatorio completar todos los campos."
            });
        }

        const nombreNormalizado = nombre.trim();
        const telefonoNormalizado = telefono.trim();
        const emailNormalizado = email.trim().toLowerCase();

        if (
            nombreNormalizado.length < 5 ||
            nombreNormalizado.length > 15
        ) {
            return res.status(400).json({
                message: "El nombre debe tener entre 5 y 15 caracteres."
            });
        }

        if (!/^\d{10}$/.test(telefonoNormalizado)) {
            return res.status(400).json({
                message: "El teléfono debe tener exactamente 10 dígitos."
            });
        }

        if (
            emailNormalizado.length > 254 ||
            !EMAIL_REGEX.test(emailNormalizado)
        ) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        if (Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 bytes."
            });
        }

        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula."
            });
        }

        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula."
            });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número."
            });
        }

        if (!/[@#$%&*()_]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un carácter especial."
            });
        }

       
        const emailExistente = await Usuario.findOne({
            where: {
                email: emailNormalizado
            }
        });

        if (emailExistente && emailExistente.id !== usuarioId) {
            return res.status(400).json({
                message: "El correo electrónico ya está en uso por otro usuario."
            });
        }

      
        const passwordHash = await bcrypt.hash(password, 10);

       
        await Usuario.update(
            {
                nombre: nombreNormalizado,
                telefono: telefonoNormalizado,
                email: emailNormalizado,
                password: passwordHash
            },
            {
                where: {
                    id: usuarioId
                }
            }
        );

        return res.status(200).json({
            message: "Datos actualizados correctamente."
        });

    } catch (error) {
        console.error(
            "Error al actualizar los datos del usuario:",
            error
        );

        return res.status(500).json({
            message: "Error al actualizar los datos."
        });
    }
}
