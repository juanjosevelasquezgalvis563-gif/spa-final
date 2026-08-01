import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../config/db.js';

export async function login(req,res){
    try{
        const {email,password} = req.body;
        if(!email || !password){
            return res.status(400).json({message: 'Todos los campos son obligatorios'});
        }
        const [rows] = await db.promise().query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        if(rows.length === 0){
            return res.status(400).json({message: 'Usuario no encontrado'});
        }
        const user = rows[0];
        
        const valido = await bcrypt.compare(password,user.password);
        if(!valido){
            return res.status(400).json({message: 'Credenciales incorrectas'});
        }
        const token = jwt.sign(
           {id:user.id, nombre:user.nombre, email:user.email, rol:user.rol},
            process.env.JWT_SECRET,
            {expiresIn: '1h'}
        );
        return res.json({
            token,
            user:{
                id:user.id,
                nombre:user.nombre,
                email:user.email,
                rol:user.rol
            }
        });
    } catch(error){
        return res.status(500).json({message: error.message});
    }
}
export async function me(req,res){
  return res.json({ user: req.user });
}