import bcrypt from 'bcrypt';
import Usuario from '../models/Usuario.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * Valida el token de Cloudflare Turnstile.
 * @param {string} token - El token generado por el widget de Turnstile en el frontend.
 * @returns {Promise<boolean>} Verdadero si el token es válido, falso en caso contrario.
 */
async function validarTurnstile(token) {
    if (!TURNSTILE_SECRET_KEY || !token) {
        console.warn('Turnstile: Clave secreta no configurada o token no recibido.');
        return false;
    }
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Turnstile: Falló la verificación.', data['error-codes']);
        }
        return Boolean(data.success);
    } catch (error) {
        console.error('Turnstile: Error al validar Turnstile:', error);
        return false;
    }
}


export async function registro(req, res) {
    try {
        const { nombre, telefono, email, password, turnstileToken } = req.body ?? {};

       
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
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }
        if (nombre.trim().length < 5 || nombre.trim().length > 255) {
            return res.status(400).json({ message: "El nombre debe tener entre 5 y 255 caracteres" });
        }
        if (telefono.trim().length < 10 || telefono.trim().length > 255) {
            return res.status(400).json({ message: "El teléfono debe tener entre 10 y 255 caracteres" });
        }
        const correoNormalizado = email.trim().toLowerCase();
        if (correoNormalizado.length > 254 || !EMAIL_REGEX.test(correoNormalizado)) {
            return res.status(400).json({ message: "Ingresa un correo electrónico válido" });
        }
        if (Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "La contraseña no puede superar los 72 bytes" });
        }

        let tieneMayuscula = false;
        let tieneMinuscula = false;
        let tieneNumero = false;
        let tieneCaracterEspecial = false;

        for (const caracter of password) {
            if (caracter >= "A" && caracter <= "Z") tieneMayuscula = true;
            else if (caracter >= "a" && caracter <= "z") tieneMinuscula = true;
            else if (caracter >= "0" && caracter <= "9") tieneNumero = true;
            else if ("@#$%&*()_".includes(caracter)) tieneCaracterEspecial = true;
        }

        if (!tieneMayuscula) return res.status(400).json({ message: "La contraseña debe tener al menos una mayúscula" });
        if (!tieneMinuscula) return res.status(400).json({ message: "La contraseña debe tener al menos una minúscula" });
        if (!tieneNumero) return res.status(400).json({ message: "La contraseña debe tener al menos un número" });
        if (!tieneCaracterEspecial) return res.status(400).json({ message: "La contraseña debe tener al menos un caracter especial" });
        if (password.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

       
        const usuarioExistente = await Usuario.findOne({ where: { email: correoNormalizado } });
        if (usuarioExistente) {
            return res.status(400).json({
                message: "Este usuario ya está registrado en el sistema"
            });
        }

        
        const passwordHash = await bcrypt.hash(password, 10);

        await Usuario.create({
            nombre: nombre.trim(),
            telefono: telefono.trim(),
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

        const { nombre, telefono, email, password } = req.body;

    
        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({
                message: "Para actualizar tus datos es obligatorio completar todos los campos"
            });
        }

       
        if (nombre.length < 5) {
            return res.status(400).json({
                message: "El nombre debe tener al menos 5 caracteres"
            });
        }
        if (telefono.length < 10) {
            return res.status(400).json({
                message: "El teléfono debe tener al menos 10 caracteres"
            });
        }

        
        let tieneMayuscula = false;
        let tieneMinuscula = false;
        let tieneNumero = false;
        let tieneCaracterEspecial = false;

        for (let i = 0; i < password.length; i++) {
            if (password[i] >= 'A' && password[i] <= 'Z') {
                tieneMayuscula = true;
            } else if (password[i] >= 'a' && password[i] <= 'z') {
                tieneMinuscula = true;
            } else if (password[i] >= '0' && password[i] <= '9') {
                tieneNumero = true;
            } else if ("@#$%&*()_".includes(password[i])) { 
                tieneCaracterEspecial = true;
            }
        }

        if (!tieneMayuscula) {
            return res.status(400).json({ message: "La contraseña debe tener al menos una mayúscula" });
        } else if (!tieneMinuscula) {
            return res.status(400).json({ message: "La contraseña debe tener al menos una minúscula" });
        } else if (!tieneNumero) {
            return res.status(400).json({ message: "La contraseña debe tener al menos un número" });
        } else if (!tieneCaracterEspecial) {
            return res.status(400).json({ message: "La contraseña debe tener al menos un caracter especial" });
        } else if (password.length < 8) {
            return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        }

        
        const emailNormalizado = email.trim().toLowerCase();
        if (emailNormalizado.length > 254 || !EMAIL_REGEX.test(emailNormalizado)) {
            return res.status(400).json({ message: "Ingresa un correo electrónico válido" });
        }

        const emailExistente = await Usuario.findOne({
            where: { email: emailNormalizado }
        });

        if (emailExistente && emailExistente.id !== usuarioId) {
            return res.status(400).json({
                message: "El correo electrónico ya está en uso por otro usuario"
            });
        }

        
        const hash = await bcrypt.hash(password, 10);

        await Usuario.update(
            {
                nombre: nombre,
                telefono: telefono,
                email: emailNormalizado,
                password: hash,
                rol: 'cliente' 
            },
            {
                where: { id: usuarioId }
            }
        );

        return res.status(200).json({
            message: "Datos actualizados correctamente"
        });

    } catch (error) {
        console.error("Error al actualizar los datos del usuario:", error);
        return res.status(500).json({
            message: "Error al actualizar los datos"
        });
    }
}
