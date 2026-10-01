import bcrypt from 'bcrypt';
import Usuario from '../models/Usuario.js';

export async function registro(req, res) {

    try {
        const { nombre, telefono, email, password } = req.body;

        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({
                error: "Todos los campos son obligatorios"
            });
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
            else if (
                password[i] == '@' ||
                password[i] == '#' ||
                password[i] == '$' ||
                password[i] == '%' ||
                password[i] == '&' ||
                password[i] == '*' ||
                password[i] == '(' ||
                password[i] == ')' ||
                password[i] == '_'
            ) {
                tieneCaracterEspecial = true;
            }
        }

        if (!tieneMayuscula) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos una mayúscula"
            });
        }
        else if (!tieneMinuscula) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos una minúscula"
            });
        }
        else if (!tieneNumero) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos un número"
            });
        }
        else if (!tieneCaracterEspecial) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos un caracter especial"
            });
        }
        else if (password.length < 8) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 8 caracteres"
            });
        }

        if (nombre.length < 5) {
            return res.status(400).json({
                error: "El nombre debe tener al menos 5 caracteres"
            });
        }

        if (telefono.length < 10) {
            return res.status(400).json({
                error: "El teléfono debe tener al menos 10 caracteres"
            });
        }

        const usuario = await Usuario.findOne({
            where: {
                email: email
            }
        });

        if (usuario) {
            return res.status(400).json({
                error: "Este usuario ya está registrado en el sistema"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        await Usuario.create({
            nombre: nombre,
            telefono: telefono,
            email: email,
            password: hash
        });

        return res.status(201).json({
            message: "Usuario registrado correctamente"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
}


export async function actualizarDatos(req, res) {

    try {

        const usuarioId = req.user.id;

        const { nombre, telefono, email, password } = req.body;

        if (!nombre || !telefono || !email || !password) {
            return res.status(400).json({
                error: "Para actualizar tus datos es obligatorio completar todos los campos"
            });
        }

        if (nombre.length < 5) {
            return res.status(400).json({
                error: "El nombre debe tener al menos 5 caracteres"
            });
        }

        if (telefono.length < 10) {
            return res.status(400).json({
                error: "El teléfono debe tener al menos 10 caracteres"
            });
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
            else if (
                password[i] == '@' ||
                password[i] == '#' ||
                password[i] == '$' ||
                password[i] == '%' ||
                password[i] == '&' ||
                password[i] == '*' ||
                password[i] == '(' ||
                password[i] == ')' ||
                password[i] == '_'
            ) {
                tieneCaracterEspecial = true;
            }
        }

        if (!tieneMayuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una mayúscula"
            });
        }
        else if (!tieneMinuscula) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos una minúscula"
            });
        }
        else if (!tieneNumero) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un número"
            });
        }
        else if (!tieneCaracterEspecial) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos un caracter especial"
            });
        }
        else if (password.length < 8) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 8 caracteres"
            });
        }

        const emailExistente = await Usuario.findOne({
            where: {
                email: email
            }
        });

        if (emailExistente && emailExistente.id !== usuarioId) {
            return res.status(400).json({
                message: "El correo electrónico ya está en uso por otro usuario"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        await Usuario.update(
            {
                nombre: nombre,
                telefono: telefono,
                email: email,
                password: hash
            },
            {
                where: {
                    id: usuarioId
                }
            }
        );

        return res.status(200).json({
            message: "Datos actualizados correctamente"
        });

    } catch (error) {

        return res.status(500).json({
            message: "Error al actualizar los datos"
        });
    }
}