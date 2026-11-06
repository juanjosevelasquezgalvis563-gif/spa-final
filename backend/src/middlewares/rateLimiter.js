import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Limita las solicitudes de recuperación por dirección IP.
export const forgotPasswordIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Demasiadas solicitudes desde esta conexión. Intenta de nuevo en 15 minutos."
    }
});


// Evita múltiples solicitudes de recuperación para el mismo correo.
export const forgotPasswordEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email;

        if (typeof email === "string" && email.trim()) {
            return `email:${email.trim().toLowerCase()}`;
        }

        return `ip:${ipKeyGenerator(req.ip)}`;
    },
    message: {
        message:
            "Ya solicitaste varios enlaces para este correo. Intenta de nuevo en 15 minutos."
    }
});
