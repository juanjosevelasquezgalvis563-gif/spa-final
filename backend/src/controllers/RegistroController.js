
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";
import { enviarCodigoActualizacion } from "../utils/correo.js";
import { enviarCodigoPorSms } from "../utils/sms.js";
import { SESSION_IDLE_TIMEOUT_SECONDS, sessionCookieOptions } from "../config/cookies.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const codigosActualizacion = new Map();

function ocultarCorreo(email) {
    const [usuario, dominio] = String(email).split("@");
    if (!dominio) return "correo registrado";
    return `${usuario.slice(0, 1)}${"•".repeat(Math.min(Math.max(usuario.length - 1, 3), 8))}@${dominio}`;
}

function ocultarTelefono(telefono) {
    const digitos = String(telefono).replace(/\D/g, "");
    return `••••••${digitos.slice(-4)}`;
}

function hashCodigo(codigo, sal) {
    return crypto.createHash("sha256").update(`${sal}:${codigo}`).digest();
}

function revisarCodigoActualizacion(usuarioId, codigo) {
    const clave = String(usuarioId);
    const reto = codigosActualizacion.get(clave);
    if (!reto || reto.expiraEn <= Date.now()) {
        codigosActualizacion.delete(clave);
        return { valido: false, status: 400, message: "Solicita un nuevo código de verificación." };
    }
    if (reto.intentos >= 5) {
        codigosActualizacion.delete(clave);
        return { valido: false, status: 429, message: "Se agotaron los intentos. Solicita un nuevo código." };
    }

    const recibido = typeof codigo === "string" && /^\d{6}$/.test(codigo)
        ? hashCodigo(codigo, reto.sal)
        : Buffer.alloc(32);
    const coincide = crypto.timingSafeEqual(reto.hash, recibido);
    if (!coincide) {
        reto.intentos += 1;
        return { valido: false, status: 400, message: "El código no es correcto. Revísalo e inténtalo de nuevo." };
    }
    return { valido: true, reto };
}

export async function obtenerDatosActualizacion(req, res) {
    try {
        const usuario = await Usuario.findByPk(req.user.id, {
            attributes: ["id", "nombre", "telefono", "email", "rol"]
        });
        if (!usuario) return res.status(404).json({ message: "No encontramos tu cuenta." });
        return res.json({ user: usuario });
    } catch (error) {
        console.error("No se pudo cargar el perfil para actualizar:", error);
        return res.status(500).json({ message: "No pudimos cargar tus datos." });
    }
}

export async function solicitarCodigoActualizacion(req, res) {
    try {
        const canal = req.body?.canal;
        if (!["correo", "telefono"].includes(canal)) {
            return res.status(400).json({ message: "Elige si quieres recibir el código por correo o teléfono." });
        }

        const usuario = await Usuario.findByPk(req.user.id, {
            attributes: ["id", "email", "telefono"]
        });
        if (!usuario) return res.status(404).json({ message: "No encontramos tu cuenta." });

        const destino = canal === "correo" ? usuario.email : usuario.telefono;
        if (!destino) {
            return res.status(400).json({ message: `Tu cuenta no tiene un ${canal === "correo" ? "correo" : "teléfono"} registrado para verificar.` });
        }

        const clave = String(usuario.id);
        const anterior = codigosActualizacion.get(clave);
        if (anterior?.reenviarEn > Date.now()) {
            const segundos = Math.ceil((anterior.reenviarEn - Date.now()) / 1000);
            return res.status(429).json({ message: `Espera ${segundos} segundos antes de pedir otro código.` });
        }

        const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
        if (canal === "correo") await enviarCodigoActualizacion(destino, codigo);
        else await enviarCodigoPorSms(destino, codigo);

        const sal = crypto.randomBytes(16).toString("hex");
        codigosActualizacion.set(clave, {
            hash: hashCodigo(codigo, sal),
            sal,
            canal,
            intentos: 0,
            expiraEn: Date.now() + 10 * 60 * 1000,
            reenviarEn: Date.now() + 60 * 1000
        });
        if (codigosActualizacion.size > 5000) {
            for (const [id, reto] of codigosActualizacion) {
                if (reto.expiraEn <= Date.now()) codigosActualizacion.delete(id);
            }
        }

        return res.json({
            message: `Enviamos el código a ${canal === "correo" ? "tu correo" : "tu teléfono"} ${canal === "correo" ? ocultarCorreo(destino) : ocultarTelefono(destino)}.`,
            canal,
            venceEnSegundos: 600,
            reenviarEnSegundos: 60
        });
    } catch (error) {
        console.error("No se pudo enviar el código de actualización:", error.message);
        if (error.message.includes("no está configurado")) {
            return res.status(503).json({ message: error.message });
        }
        return res.status(502).json({ message: error.message || "No pudimos enviar el código. Inténtalo de nuevo." });
    }
}


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
                message: "La contraseña es demasiado larga. Reduce su longitud e inténtalo de nuevo."
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

        const { nombre, telefono, email, password = "", codigoVerificacion } = req.body ?? {};

        if (
            typeof nombre !== "string" ||
            typeof telefono !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !nombre.trim() ||
            !telefono.trim() ||
            !email.trim()
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

        if (password && password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        if (password && Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                message: "La contraseña no puede superar los 72 bytes."
            });
        }

        if (password && !/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula."
            });
        }

        if (password && !/[a-z]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula."
            });
        }

        if (password && !/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número."
            });
        }

        if (password && !/[@#$%&*()_]/.test(password)) {
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

      
        const verificacion = revisarCodigoActualizacion(usuarioId, codigoVerificacion);
        if (!verificacion.valido) {
            return res.status(verificacion.status).json({ message: verificacion.message });
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

        await Usuario.update(
            {
                nombre: nombreNormalizado,
                telefono: telefonoNormalizado,
                email: emailNormalizado,
                ...(passwordHash ? { password: passwordHash } : {})
            },
            { where: { id: usuarioId } }
        );
        codigosActualizacion.delete(String(usuarioId));

        const usuarioActualizado = await Usuario.findByPk(usuarioId, {
            attributes: ["id", "nombre", "email", "telefono", "rol"]
        });
        const tokenActualizado = jwt.sign(
            { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, email: usuarioActualizado.email, rol: usuarioActualizado.rol },
            process.env.JWT_SECRET,
            { expiresIn: SESSION_IDLE_TIMEOUT_SECONDS }
        );
        res.cookie("token", tokenActualizado, sessionCookieOptions);

        return res.status(200).json({
            message: "Datos actualizados correctamente.",
            user: usuarioActualizado
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
