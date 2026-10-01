import jwt from 'jsonwebtoken'

export function middlewareAdmin(req,res,next){
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message: 'sin token'})
    }
    
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded;
        if(req.user.rol !== 'administrador'){
            return res.status(403).json({message: 'no tienes permisos para acceder a esta ruta'})
        }
        next();
    }catch(error){
         return res.status(401).json({message: 'token invalido o expirado'})
    }
}