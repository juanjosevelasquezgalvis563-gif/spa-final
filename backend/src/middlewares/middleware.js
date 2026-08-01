import jwt from 'jsonwebtoken'

export function middleware(req,res,next){
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
        next();

    }catch(error){
         return res.status(500).json({message: 'token invalido o expirado'})
    }
}