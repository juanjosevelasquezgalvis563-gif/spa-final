import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js';

export async function middleware(req,res,next){
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message: 'sin token'})
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded;
        const perfilActivo = decoded.rol === 'administrador' && req.cookies.adminPerfil
            ? JSON.parse(req.cookies.adminPerfil)
            : null;
        if (perfilActivo && req.method === 'PUT') {
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