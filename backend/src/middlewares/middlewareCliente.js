import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js';

export async function middlewareCliente(req,res,next){
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message: 'sin token'})
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.rol === 'administrador' && req.query.perfilId) {
            const cliente = await Usuario.findOne({
                attributes: ['id'],
                where: { id: req.query.perfilId, rol: 'cliente' }
            });
            if (!cliente) {
                return res.status(404).json({ message: 'No se encontró el perfil de cliente seleccionado.' });
            }
            req.user = { ...decoded, id: cliente.id };
        } else if (decoded.rol === 'cliente') {
            req.user = decoded;
        } else {
            return res.status(403).json({message: 'no tienes permisos para acceder a esta ruta'})
        }
        next();
    }catch(error){
         return res.status(500).json({message: 'token invalido o expirado'})
    }
}