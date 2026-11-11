import jwt from "jsonwebtoken";
import {
    adminProfileCookieOptions,
    sessionCookieOptions,
    SESSION_IDLE_TIMEOUT_SECONDS,
    authCookieOptions
} from "../config/cookies.js";

export function obtenerSesion(req, res) {
    const token = req.cookies?.token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { iat, exp, ...claims } = decoded;
        const tokenRenovado = jwt.sign(
            claims,
            process.env.JWT_SECRET,
            { expiresIn: SESSION_IDLE_TIMEOUT_SECONDS }
        );

        res.cookie("token", tokenRenovado, sessionCookieOptions);
        if (decoded.rol === "administrador" && req.cookies.adminPerfil) {
            res.cookie("adminPerfil", req.cookies.adminPerfil, adminProfileCookieOptions);
        }

        return decoded;
    } catch {
        res.clearCookie("token", authCookieOptions);
        return null;
    }
}
