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
        if (decoded.rol === 'administrador' && req.method === 'PUT' && req.query.perfilId) {
            const perfil = await Usuario.findOne({
                attributes: ['id'],
                where: { id: req.query.perfilId, rol: ['cliente', 'empleado'] }
            });
            if (!perfil) {
                return res.status(404).json({ message: 'No se encontró el perfil seleccionado.' });
            }
            req.user = { ...decoded, id: perfil.id };
        }
        next();

    }catch(error){
         return res.status(401).json({message: 'token invalido o expirado'})
    }
}