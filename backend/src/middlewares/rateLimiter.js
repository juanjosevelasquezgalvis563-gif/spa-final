import rateLimit from "express-rate-limit";

// Límite por IP: evita que un mismo origen bombardee el endpoint
// de recuperación de contraseña.
export const forgotPasswordIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 peticiones por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Demasiadas solicitudes desde esta conexión. Intenta de nuevo en 15 minutos."
    }
});

// Límite por correo: evita que se inunde el buzón de una víctima
// con muchos correos de recuperación, aunque el atacante cambie de IP.
export const forgotPasswordEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // máximo 3 peticiones por correo
    standardHeaders: true,
    legacyHeaders: false,
    // Si no hay email en el body, se usa la IP como respaldo.
    keyGenerator: (req) => {
        const email = req.body && req.body.email;
        return typeof email === "string"
            ? email.toLowerCase()
            : req.ip;
    },
    message: {
        message:
            "Ya solicitaste varios enlaces para este correo. Intenta de nuevo en 15 minutos."
    }
});
