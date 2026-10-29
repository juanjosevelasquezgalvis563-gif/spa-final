import bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import Usuario from '../models/Usuario.js';

const captchaChallenges = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_MAX_CHALLENGES = 5000;
const CAPTCHA_REQUIRED_SELECTIONS = 4;
const CAPTCHA_REQUIRED_ROUNDS = 3;
const captchaProofs = new Map();
const captchaSessions = new Map();
const CAPTCHA_SHAPES = [
    { name: 'semáforo', svg: '<path d="M49 73h6v19h-6z" fill="#64748b" stroke="none"/><rect x="34" y="8" width="32" height="68" rx="9" fill="#263449" stroke="#172033" stroke-width="3"/><circle cx="50" cy="24" r="8" fill="#ef4444" stroke="#fecaca" stroke-width="2"/><circle cx="50" cy="42" r="8" fill="#f59e0b" stroke="#fde68a" stroke-width="2"/><circle cx="50" cy="60" r="8" fill="#22c55e" stroke="#bbf7d0" stroke-width="2"/>' },
    { name: 'bicicleta', svg: '<g fill="none" stroke="#334155" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="68" r="15"/><circle cx="76" cy="68" r="15"/><path d="m24 68 16-27 17 27H24l13-20h19l20 20M38 41h-9m28 0h9m-17 0 4-7h8"/><circle cx="57" cy="68" r="3" fill="#f59e0b" stroke="none"/></g>' },
    { name: 'autobús', svg: '<rect x="17" y="15" width="66" height="57" rx="11" fill="#fbbf24" stroke="#92400e" stroke-width="3"/><path d="M22 25a5 5 0 0 1 5-5h46a5 5 0 0 1 5 5v20H22z" fill="#dbeafe" stroke="#475569" stroke-width="2"/><path d="M49 21v23M19 53h62" stroke="#92400e" stroke-width="2"/><circle cx="31" cy="73" r="7" fill="#334155" stroke="#e2e8f0" stroke-width="2"/><circle cx="69" cy="73" r="7" fill="#334155" stroke="#e2e8f0" stroke-width="2"/><circle cx="75" cy="59" r="3" fill="#ef4444" stroke="none"/>' },
    { name: 'automóvil', svg: '<path d="M18 57 24 42q2-6 9-7h32q7 1 10 8l7 14q5 2 5 8v9H13v-9q0-6 5-8z" fill="#60a5fa" stroke="#1e3a8a" stroke-width="3"/><path d="m31 40-6 15h43l-7-15q-1-2-5-2H36q-4 0-5 2z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><circle cx="29" cy="72" r="7" fill="#1e293b" stroke="#e2e8f0" stroke-width="2"/><circle cx="71" cy="72" r="7" fill="#1e293b" stroke="#e2e8f0" stroke-width="2"/><path d="M14 62h8m56 0h8" stroke="#fde68a" stroke-width="4" stroke-linecap="round"/>' },
    { name: 'motocicleta', svg: '<g fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="25" cy="68" r="13"/><circle cx="75" cy="68" r="13"/><path d="m25 68 16-20h18l16 20H48l-9-17m20-3 8-9h9m-32 9-5-8h-8"/><path d="M43 46h18l7 8H40z" fill="#f97316" stroke="#9a3412"/><path d="M67 39h9" stroke="#64748b"/></g>' },
    { name: 'señal de tránsito', svg: '<path d="M47 54h6v37h-6z" fill="#64748b" stroke="none"/><path d="m50 10 34 20v29H16V30z" fill="#ef4444" stroke="#991b1b" stroke-width="3"/><path d="m50 17 27 16v19H23V33z" fill="none" stroke="#fff" stroke-width="3"/><text x="50" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#fff" stroke="none">STOP</text>' }
];

function crearImagenCaptcha(shape, color, background) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="${background}"/><path d="M0 25h100M0 75h100M25 0v100M75 0v100" stroke="#ffffff" stroke-opacity=".35"/><g fill="${color}" stroke="#422b50" stroke-width="2" stroke-linejoin="round">${shape.svg}</g><circle cx="12" cy="12" r="2" fill="#d4af37"/><circle cx="88" cy="88" r="2" fill="#d4af37"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function crearDesafioCaptcha(sessionId, round) {
    const ahora = Date.now();
    for (const [id, session] of captchaSessions) {
        if (session.expiresAt <= ahora) captchaSessions.delete(id);
    }
    for (const [id, challenge] of captchaChallenges) {
        if (challenge.expiresAt <= ahora) captchaChallenges.delete(id);
    }
    while (captchaChallenges.size >= CAPTCHA_MAX_CHALLENGES) {
        captchaChallenges.delete(captchaChallenges.keys().next().value);
    }

    const target = CAPTCHA_SHAPES[randomInt(CAPTCHA_SHAPES.length)];
    const distractors = CAPTCHA_SHAPES.filter((shape) => shape !== target);
    const opciones = [target, target, target, target];

    while (opciones.length < 8) {
        opciones.push(distractors[randomInt(distractors.length)]);
    }

    for (let index = opciones.length - 1; index > 0; index--) {
        const swapIndex = randomInt(index + 1);
        [opciones[index], opciones[swapIndex]] = [opciones[swapIndex], opciones[index]];
    }

    const respuesta = opciones
        .map((shape, index) => shape === target ? index : null)
        .filter((index) => index !== null);
    const colores = ['#d8b4e2', '#b9d8ca', '#f4d18c', '#a8c9e8', '#e9b7a8', '#c4c6ef', '#b5d7dc', '#e6c6a5'];
    const fondos = ['#fbf5fc', '#f2faf5', '#fff9ed', '#f1f7fc', '#fff5f1', '#f5f5ff', '#f1fbfc', '#fff9f1'];
    const challengeId = randomUUID();
    captchaChallenges.set(challengeId, {
        respuesta,
        sessionId,
        round,
        expiresAt: ahora + CAPTCHA_TTL_MS
    });

    return {
        challengeId,
        sessionId,
        round,
        totalRounds: CAPTCHA_REQUIRED_ROUNDS,
        prompt: `Selecciona todas las imágenes que contienen ${target.name}.`,
        images: opciones.map((shape, index) => ({
            id: index,
            src: crearImagenCaptcha(shape, colores[index], fondos[index])
        }))
    };
}

export function obtenerCaptcha(req, res) {
    const sessionId = randomUUID();
    captchaSessions.set(sessionId, { round: 1, expiresAt: Date.now() + CAPTCHA_TTL_MS });
    res.set('Cache-Control', 'no-store');
    return res.json(crearDesafioCaptcha(sessionId, 1));
}

export function verificarCaptcha(req, res) {
    const { challengeId, captchaAnswer } = req.body;
    if (typeof challengeId !== 'string' || !Array.isArray(captchaAnswer)) {
        return res.status(400).json({ message: 'Selecciona al menos 4 imágenes para verificar.' });
    }
    if (captchaAnswer.length < CAPTCHA_REQUIRED_SELECTIONS) {
        return res.status(400).json({ message: 'Debes seleccionar al menos 4 imágenes.' });
    }
    if (captchaAnswer.length !== CAPTCHA_REQUIRED_SELECTIONS || captchaAnswer.some((id) => !Number.isInteger(id) || id < 0 || id >= 8)) {
        return res.status(400).json({ message: 'Selecciona exactamente 4 imágenes para esta verificación.' });
    }

    const challenge = captchaChallenges.get(challengeId);
    captchaChallenges.delete(challengeId);

    const session = challenge && captchaSessions.get(challenge.sessionId);
    const esCorrecto = Boolean(
        challenge &&
        challenge.expiresAt > Date.now() &&
        session &&
        session.expiresAt > Date.now() &&
        session.round === challenge.round &&
        JSON.stringify([...captchaAnswer].sort((a, b) => a - b)) ===
            JSON.stringify([...challenge.respuesta].sort((a, b) => a - b))
    );

    if (!esCorrecto) {
        if (session && session.expiresAt > Date.now()) {
            res.set('Cache-Control', 'no-store');
            return res.status(400).json({
                message: 'La selección no es correcta. Inténtalo de nuevo.',
                captcha: crearDesafioCaptcha(challenge.sessionId, session.round)
            });
        }
        return res.status(400).json({ message: 'El CAPTCHA caducó. Carga un reto nuevo.' });
    }

    session.round += 1;

    if (session.round <= CAPTCHA_REQUIRED_ROUNDS) {
        res.set('Cache-Control', 'no-store');
        return res.json({
            verified: false,
            roundCompleted: session.round - 1,
            round: session.round,
            totalRounds: CAPTCHA_REQUIRED_ROUNDS,
            captcha: crearDesafioCaptcha(challenge.sessionId, session.round)
        });
    }

    captchaSessions.delete(challenge.sessionId);

    for (const [token, expiresAt] of captchaProofs) {
        if (expiresAt <= Date.now()) captchaProofs.delete(token);
    }
    while (captchaProofs.size >= CAPTCHA_MAX_CHALLENGES) {
        captchaProofs.delete(captchaProofs.keys().next().value);
    }

    const proof = randomUUID();
    captchaProofs.set(proof, Date.now() + CAPTCHA_TTL_MS);
    res.set('Cache-Control', 'no-store');
    return res.json({ verified: true, captchaProof: proof });
}

function consumirCaptchaProof(proof) {
    if (typeof proof !== 'string') return false;

    const expiresAt = captchaProofs.get(proof);
    captchaProofs.delete(proof);
    return Boolean(expiresAt && expiresAt > Date.now());
}

export async function registro(req, res) {

    try {
        const { nombre, telefono, email, password, captchaProof } = req.body;

        if (!consumirCaptchaProof(captchaProof)) {
            return res.status(400).json({
                message: "Completa nuevamente la verificación visual antes de registrarte."
            });
        }


        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({
                message: "Todos los campos son obligatorios"
            });
        }

        let tieneMayuscula = false;
        let tieneMinuscula = false;
        let tieneNumero = false;
        let tieneCaracterEspecial = false;

        for (let i = 0; i < password.length; i++) {

            if (password[i] >= 'A' && password[i] <= 'Z') {
                tieneMayuscula = true;
            }
            else if (password[i] >= 'a' && password[i] <= 'z') {
                tieneMinuscula = true;
            }
            else if (password[i] >= '0' && password[i] <= '9') {
                tieneNumero = true;
            }
            else if (
                password[i] == '@' ||
                password[i] == '#' ||
                password[i] == '$' ||
                password[i] == '%' ||
                password[i] == '&' ||
                password[i] == '*' ||
                password[i] == '(' ||
                password[i] == ')' ||
                password[i] == '_'
            ) {
                tieneCaracterEspecial = true;
            }
        }

        if (!tieneMayuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula"
            });
        }
        else if (!tieneMinuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula"
            });
        }
        else if (!tieneNumero) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número"
            });
        }
        else if (!tieneCaracterEspecial) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un caracter especial"
            });
        }
        else if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres"
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

        const usuario = await Usuario.findOne({
            where: {
                email: email
            }
        });

        if (usuario) {
            return res.status(400).json({
                message: "Este usuario ya está registrado en el sistema"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        await Usuario.create({
            nombre: nombre,
            telefono: telefono,
            email: email,
            password: hash,
            rol: 'cliente'
        });

        return res.status(201).json({
            message: "Usuario registrado correctamente"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
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
            }
            else if (password[i] >= 'a' && password[i] <= 'z') {
                tieneMinuscula = true;
            }
            else if (password[i] >= '0' && password[i] <= '9') {
                tieneNumero = true;
            }
            else if (
                password[i] == '@' ||
                password[i] == '#' ||
                password[i] == '$' ||
                password[i] == '%' ||
                password[i] == '&' ||
                password[i] == '*' ||
                password[i] == '(' ||
                password[i] == ')' ||
                password[i] == '_'
            ) {
                tieneCaracterEspecial = true;
            }
        }

        if (!tieneMayuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula"
            });
        }
        else if (!tieneMinuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula"
            });
        }
        else if (!tieneNumero) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número"
            });
        }
        else if (!tieneCaracterEspecial) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un caracter especial"
            });
        }
        else if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres"
            });
        }

        const emailExistente = await Usuario.findOne({
            where: {
                email: email
            }
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
                email: email,
                password: hash,
                rol: 'cliente'
            },
            {
                where: {
                    id: usuarioId
                }
            }
        );

        return res.status(200).json({
            message: "Datos actualizados correctamente"
        });

    } catch (error) {

        return res.status(500).json({
            message: "Error al actualizar los datos"
        });
    }
}