import bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import Usuario from '../models/Usuario.js';

const captchaChallenges = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_MAX_CHALLENGES = 5000;
const CAPTCHA_REQUIRED_SELECTIONS = 4;
const CAPTCHA_REQUIRED_ROUNDS = 3;
const CAPTCHA_IMAGE_SIZE = 320;
const captchaProofs = new Map();
const captchaSessions = new Map();
const CAPTCHA_SHAPES = [
    {
        name: 'semáforo',
        images: [
            'photo-1557404763-69708cd8b9ce',
            'photo-1581677641984-cf14ca58c5ee',
            'photo-1624724126923-e2c021df1311',
            'photo-1530652101053-8c0db4fbb5de',
            'photo-1527603815363-e79385e0747e'
        ]
    },
    {
        name: 'bicicleta',
        images: [
            'photo-1485965120184-e220f721d03e',
            'photo-1532298229144-0ec0c57515c7',
            'photo-1618762044398-ec1e7e048bbd',
            'photo-1507035895480-2b3156c31fc8',
            'photo-1452573992436-6d508f200b30'
        ]
    },
    {
        name: 'autobús',
        images: [
            'photo-1570125909232-eb263c188f7e',
            'photo-1632276536839-84cad7fd03b0',
            'photo-1570125909517-53cb21c89ff2',
            'photo-1544620347-c4fd4a3d5957',
            'photo-1564694202883-46e7448c1b26'
        ]
    },
    {
        name: 'automóvil',
        images: [
            'photo-1580273916550-e323be2ae537',
            'photo-1503376780353-7e6692767b70',
            'photo-1494976388531-d1058494cdd8',
            'photo-1492144534655-ae79c964c9d7',
            'photo-1568605117036-5fe5e7bab0b7'
        ]
    },
    {
        name: 'motocicleta',
        images: [
            'photo-1449426468159-d96dbf08f19f',
            'photo-1588627541420-fce3f661b779',
            'photo-1591637333184-19aa84b3e01f',
            'photo-1558981403-c5f9899a28bc',
            'photo-1558981806-ec527fa84c39'
        ]
    },
    {
        name: 'señal de tránsito',
        images: [
            'photo-1572670014853-1d3a3f22b40f',
            'photo-1618737739013-aed8938604fb',
            'photo-1506704810770-7e9bbab1094b',
            'photo-1546617885-4822125f891e',
            'photo-1520716963369-9b24de965de4'
        ]
    }
];

function barajar(elementos) {
    const resultado = [...elementos];

    for (let index = resultado.length - 1; index > 0; index--) {
        const swapIndex = randomInt(index + 1);
        [resultado[index], resultado[swapIndex]] = [resultado[swapIndex], resultado[index]];
    }

    return resultado;
}

function crearImagenCaptcha(photoId) {
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${CAPTCHA_IMAGE_SIZE}&h=${CAPTCHA_IMAGE_SIZE}&q=75`;
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
    const distractors = barajar(CAPTCHA_SHAPES.filter((shape) => shape !== target)).slice(0, 4);
    const opciones = [
        ...barajar(target.images).slice(0, CAPTCHA_REQUIRED_SELECTIONS).map((photoId) => ({
            shape: target,
            photoId
        })),
        ...distractors.map((shape) => ({
            shape,
            photoId: shape.images[randomInt(shape.images.length)]
        }))
    ];
    const opcionesBarajadas = barajar(opciones);

    const respuesta = opcionesBarajadas
        .map((opcion, index) => opcion.shape === target ? index : null)
        .filter((index) => index !== null);
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
        images: opcionesBarajadas.map((opcion, index) => ({
            id: index,
            src: crearImagenCaptcha(opcion.photoId)
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