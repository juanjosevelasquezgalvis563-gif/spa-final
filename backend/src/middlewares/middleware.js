import Usuario from '../models/Usuario.js';
import { obtenerSesion } from "./session.js";

export async function middleware(req,res,next){
    const decoded = obtenerSesion(req, res);
    if(!decoded){
        return res.status(401).json({message: 'sin token'})
    }

    try{
        req.user = decoded;
        const perfilActivo = decoded.rol === 'administrador' && req.cookies.adminPerfil
            ? JSON.parse(req.cookies.adminPerfil)
            : null;
        // Los datos personales se verifican contra el contacto del usuario que inició sesión.
        // No aplicar la suplantación del perfil activo en este endpoint.
        if (perfilActivo && req.method === 'PUT' && req.path !== '/registrarr') {
            const perfil = await Usuario.findOne({
                attributes: ['id'],
                where: { id: perfilActivo.id, rol: perfilActivo.rol }
            });
            if (!perfil) {
                return res.status(404).json({ message: 'No se encontró el perfil seleccionado.' });
            }
            req.user = { ...decoded, id: perfil.id, rol: perfilActivo.rol };
        }
        next();

    }catch(error){
         return res.status(401).json({message: 'token invalido o expirado'})
    }
}
