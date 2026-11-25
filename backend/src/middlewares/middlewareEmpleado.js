
import Usuario from "../models/Usuario.js";
import { obtenerSesion } from "./session.js";

export async function middlewareEmpleado(req, res, next) {
    const decoded = obtenerSesion(req, res);

    if (!decoded) {
        return res.status(401).json({
            message: "Sin token"
        });
    }

    try {
        
        if (decoded.rol === "administrador") {
            if (!req.cookies.adminPerfil) {
                return res.status(403).json({
                    message: "No hay un perfil de empleado seleccionado."
                });
            }

            let perfilActivo;

            try {
                perfilActivo = JSON.parse(req.cookies.adminPerfil);
            } catch {
                return res.status(401).json({
                    message: "El perfil seleccionado no es válido."
                });
            }

            if (perfilActivo.rol !== "empleado") {
                return res.status(403).json({
                    message: "Debes seleccionar un perfil de empleado."
                });
            }

            const empleado = await Usuario.findOne({
                attributes: ["id"],
                where: {
                    id: perfilActivo.id,
                    rol: "empleado"
                }
            });

            if (!empleado) {
                return res.status(404).json({
                    message: "No se encontró el empleado seleccionado."
                });
            }

            req.user = {
                ...decoded,
                id: decoded.id,
                rol: "administrador",
                empleadoActivoId: empleado.id
            };

            return next();
        }

      
        if (decoded.rol === "empleado") {
            req.user = decoded;
            return next();
        }

        return res.status(403).json({
            message: "No tienes permisos para acceder a esta ruta."
        });

    } catch (error) {
        console.error("Error en middlewareEmpleado:", error);

        return res.status(500).json({
            message: "Error al verificar el perfil del usuario."
        });
    }
}

