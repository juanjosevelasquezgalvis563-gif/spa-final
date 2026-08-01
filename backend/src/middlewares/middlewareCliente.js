import jwt from 'jsonwebtoken'

export function middlewareCliente(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({message: 'sin token'})
    }
    const token = authHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({message: 'token invalido'})
    }
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded;
        if(req.user.rol !== 'cliente'){
            return res.status(401).json({message: 'no tienes permisos para acceder a esta ruta'})
        }
        next();
    }catch(error){
         return res.status(500).json({message: 'token invalido o expirado'})
    }
}