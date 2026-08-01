import bcrypt from 'bcrypt';
import db from '../config/db.js';

export async function registro(req, res) {
    try {
        const { nombre, telefono, email, password, rol } = req.body;
        if (!nombre || !telefono || !email || !password || !rol) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }
        let tieneMayuscula = false;
        let tieneMinuscula = false;
        let tieneNumero = false;
        let tieneCaracterEspecial = false;

        for (let i = 0; i < password.length; i++) {
            if (password[i] >= 'A' && password[i] <= 'Z') {
                tieneMayuscula = true;
            }
            else if (password[i] >= 'a' && password[i] <= 'z') {
                tieneMinuscula = true;
            }
            else if (password[i] >= '0' && password[i] <= '9') {
                tieneNumero = true;
            }
            else if (password[i] == '@' || password[i] == '#' || password[i] == '$' || password[i] == '%' || password[i] == '&' || password[i] == '*' || password[i] == '(' || password[i] == ')' || password[i] == '_') {
                tieneCaracterEspecial = true;
            }
        }
        if (!tieneMayuscula) {
            return res.status(400).json({ message: "La contraseña debe tener al menos una mayuscula" });
        }
        else if (!tieneMinuscula) {
            return res.status(400).json({ message: "La contraseña debe tener al menos una minuscula" });
        }
        else if (!tieneNumero) {
            return res.status(400).json({ message: "La contraseña debe tener al menos un numero" });
        }
        else if (!tieneCaracterEspecial) {
            return res.status(400).json({ message: "La contraseña debe tener al menos un caracter especial" });
        }
        else if (password.length < 8) {
            return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
        }

        const [usuario] = await db.promise().query(
            'SELECT id FROM usuarios WHERE email=?',
            [email]
        );
        if (usuario.length > 0) {
            return res.status(400).json({ message: "Este usuario ya esta registrado" });
        }
        const hash = await bcrypt.hash(password, 10);

        await db.promise().query(
            'INSERT INTO usuarios (nombre,telefono,email,password,rol) VALUES (?,?,?,?,?)',
            [nombre, telefono, email, hash, 'empleado']
        );
        return res.status(201).json({ message: "Usuario registrado correctamente" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }

}

export async function actualizarDatos(req, res) {
    try {
        const usuarioId = req.user.id
        const { nombre, telefono, email, password } = req.body;
        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({ error: "Para actualizar tus datos es obligatorio completar todos los campos" });
        }
        let tieneMayuscula = false;
        let tieneMinuscula = false;
        let tieneNumero = false;
        let tieneCaracterEspecial = false;

        for (let i = 0; i < password.length; i++) {
            if (password[i] >= 'A' && password[i] <= 'Z') {
                tieneMayuscula = true;
            }
            if (password[i] >= 'a' && password[i] <= 'z') {
                tieneMinuscula = true;
            }
            if (password[i] >= '0' && password[i] <= '9') {
                tieneNumero = true;
            }
            if (password[i] == '@' || password[i] == '#' || password[i] == '$' || password[i] == '%' || password[i] == '&' || password[i] == '*' || password[i] == '_') {
                tieneCaracterEspecial = true;
            }
        }
        if (!tieneMayuscula) {
            return res.status(400).json({ error: "La contraseña debe tener al menos una mayúscula" });
        }
        if (!tieneMinuscula) {
            return res.status(400).json({ error: "La contraseña debe tener al menos una minúscula" });
        }
        if (!tieneNumero) {
            return res.status(400).json({ error: "La contraseña debe tener al menos un número" });
        }
        if (!tieneCaracterEspecial) {
            return res.status(400).json({ error: "La contraseña debe tener al menos un caracter especial" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
        }


        const hash = await bcrypt.hash(password, 10);
        const [usuarios] = await db.promise().query(
            'UPDATE usuarios SET nombre=?,telefono=?,email=?,password=? WHERE id=?',
            [nombre, telefono, email, hash,usuarioId ]

        );
      
        return res.status(200).json({ message: "Datos actualizados correctamente" });
    } catch (error) {
        return res.status(500).json({ error: "Error al actualizar los datos" })
    }
}
