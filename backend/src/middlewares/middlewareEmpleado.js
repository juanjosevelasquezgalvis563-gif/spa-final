import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js';

export async function middlewareEmpleado(req,res,next){
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message: 'sin token'})
    }
   
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const perfilActivo = decoded.rol === 'administrador' && req.cookies.adminPerfil
            ? JSON.parse(req.cookies.adminPerfil)
            : null;
        if (perfilActivo?.rol === 'empleado') {
            const empleado = await Usuario.findOne({
                attributes: ['id'],
                where: { id: perfilActivo.id, rol: 'empleado' }
            });
            if (!empleado) {
                return res.status(404).json({ message: 'No se encontró el perfil de empleado seleccionado.' });
            }
            req.user = { ...decoded, id: empleado.id, rol: 'empleado' };
        } else if (decoded.rol === 'empleado') {
            req.user = decoded;
        } else {
            return res.status(401).json({message: 'no tienes permisos para acceder a esta ruta'})
        }
        next();

    }catch(error){
         return res.status(500).json({message: 'token invalido o expirado'})
    }
}
