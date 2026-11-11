import { obtenerSesion } from "./session.js";

export function middlewareAdmin(req,res,next){
    const decoded = obtenerSesion(req, res);
    if(!decoded){
        return res.status(401).json({message: 'sin token'})
    }
    
    req.user = decoded;
    if(req.user.rol !== 'administrador'){
        return res.status(403).json({message: 'no tienes permisos para acceder a esta ruta'})
    }
    next();
}