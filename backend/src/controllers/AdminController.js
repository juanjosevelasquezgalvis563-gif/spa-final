import Usuario from "../models/Usuario.js";
import Producto from "../models/productos.js";
import Compra from "../models/compras.js";
import Cita from "../models/citas.js";
import { adminProfileCookieOptions, authCookieOptions } from "../config/cookies.js";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PRODUCT_IMAGES_DIR } from "../config/productImages.js";

const ROLES_PERFIL_ADMIN = ['empleado', 'cliente'];

export async function perfilesAdmin(req, res) {
    try {
        const rol = req.query.rol || 'empleado';
        if (!ROLES_PERFIL_ADMIN.includes(rol)) {
            return res.status(400).json({ message: 'El rol solicitado no se puede consultar desde este panel.' });
        }

        const usuarios = await Usuario.findAll({
            attributes: ['id', 'nombre', 'telefono', 'email', 'rol'],
            where: { rol },
            order: [['nombre', 'ASC']]
        });

        const perfiles = await Promise.all(usuarios.map(async (usuario) => {
            const campoId = rol === 'empleado' ? 'empleado_id' : 'usuario_id';
            const filtro = { [campoId]: usuario.id };
            const [total, pendientes, confirmadas, finalizadas, canceladas] = await Promise.all([
                Cita.count({ where: filtro }),
                Cita.count({ where: { ...filtro, estado: 'pendiente' } }),
                Cita.count({ where: { ...filtro, estado: 'confirmada' } }),
                Cita.count({ where: { ...filtro, estado: 'finalizada' } }),
                Cita.count({ where: { ...filtro, estado: 'cancelada' } })
            ]);

            return {
                ...usuario.toJSON(),
                resumenCitas: { total, pendientes, confirmadas, finalizadas, canceladas }
            };
        }));

        return res.json(perfiles);
    } catch (error) {
        return res.status(500).json({ message: 'No se pudieron obtener los perfiles.' });
    }
}

export async function activarPerfilAdmin(req, res) {
    try {
        const { id, rol } = req.body;

        if (!id || !ROLES_PERFIL_ADMIN.includes(rol)) {
            res.clearCookie('adminPerfil', authCookieOptions);
            return res.json({ message: 'Perfil administrativo limpiado.' });
        }

        const perfil = await Usuario.findOne({
            attributes: ['id'],
            where: { id, rol }
        });

        if (!perfil) {
            return res.status(404).json({ message: 'No se encontró el perfil seleccionado.' });
        }

        res.cookie('adminPerfil', JSON.stringify({ id: perfil.id, rol }), adminProfileCookieOptions);
        return res.json({ message: 'Perfil seleccionado.' });
    } catch (error) {
        return res.status(500).json({ message: 'No se pudo cargar el perfil seleccionado.' });
    }
}

export async function admin(req, res) {
    try {
        const adminId = req.user.id;

        const admin = await Usuario.findOne({
            attributes: ['id', 'nombre', 'rol'],
            where: {
                id: adminId
            }
        });

        res.json(admin);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
}


export async function productosAdmin(req, res) {
    try {

        const productos = await Producto.findAll({
            attributes: ['id', 'image', 'nombre', 'precio', 'stock', 'estado'],

        });
        for (let i = 0; i < productos.length; i++) {
            if (productos[i].stock > 5) {
                productos[i].estado = 'en stock'
            }
            if (productos[i].stock <= 5) {
                productos[i].estado = 'stock bajo'
            }
            if (productos[i].stock <= 0) {
                productos[i].estado = 'sin stock'
            }
        }
        res.json(productos);


    } catch (error) {
        return res.status(401).json({ message: 'no se pudieron obtener los productos' })
    }
}

export async function productosCatalogo(req, res) {
    try {
        const productos = await Producto.findAll({
            attributes: ['id', 'image', 'nombre', 'precio', 'stock'],
            order: [['nombre', 'ASC']]
        });

        return res.json(productos.map((producto) => ({
            id: producto.id,
            image: producto.image,
            nombre: producto.nombre,
            precio: producto.precio,
            disponible: producto.stock > 0
        })));
    } catch (error) {
        console.error('No se pudo obtener el catálogo de productos:', error);
        return res.status(500).json({ message: 'No se pudo cargar el catálogo de productos.' });
    }
}

export async function productosCreate(req, res) {
    const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
    const precio = Number(req.body.precio);
    const stock = Number(req.body.stock);
    const file = req.file;

    if (!nombre || !Number.isFinite(precio) || precio < 0 || !Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
            message: "Ingresa un nombre, un precio válido y un stock entero igual o mayor a cero."
        });
    }

    if (!file) {
        return res.status(400).json({
            message: "Selecciona una imagen PNG, JPG o WEBP de hasta 5 MB."
        });
    }

    const signatures = {
        "image/jpeg": {
            extension: ".jpg",
            matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        },
        "image/png": {
            extension: ".png",
            matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        },
        "image/webp": {
            extension: ".webp",
            matches: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF"
                && buffer.toString("ascii", 8, 12) === "WEBP"
        }
    };
    const signature = signatures[file.mimetype];

    if (!signature || !signature.matches(file.buffer)) {
        return res.status(400).json({
            message: "El archivo no es una imagen PNG, JPG o WEBP válida."
        });
    }

    const fileName = `${randomUUID()}${signature.extension}`;
    const imagePath = path.join(PRODUCT_IMAGES_DIR, fileName);
    let imageSaved = false;

    try {
        await mkdir(PRODUCT_IMAGES_DIR, { recursive: true });
        await writeFile(imagePath, file.buffer, { flag: "wx" });
        imageSaved = true;

        const producto = await Producto.create({
            image: `/uploads/products/${fileName}`,
            nombre,
            precio,
            stock,
            estado: stock > 5 ? "en stock" : stock > 0 ? "stock bajo" : "sin stock"
        });

        return res.status(201).json({
            message: "Producto agregado correctamente.",
            producto
        });
    } catch (error) {
        console.error("No se pudo crear el producto:", error);

        if (imageSaved) {
            try {
                await unlink(imagePath);
            } catch (cleanupError) {
                if (cleanupError.code !== "ENOENT") {
                    console.error("No se pudo limpiar la imagen del producto:", cleanupError);
                }
            }
        }

        return res.status(500).json({
            message: "No se pudo guardar el producto. Inténtalo nuevamente."
        });
    }
}


export async function productosUpdate(req, res) {
    try {
        const id = req.params.id;
        const { nombre: nombreBody, precio: precioBody, stock: stockBody } = req.body;
        const nombre = typeof nombreBody === "string" ? nombreBody.trim() : "";
        const precio = Number(precioBody);
        const stock = Number(stockBody);

        if (!nombre || precioBody === "" || precioBody === undefined || precioBody === null
            || !Number.isFinite(precio) || precio < 0 || stockBody === "" || stockBody === undefined
            || stockBody === null || !Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({
                message: 'Ingresa un nombre, un precio válido y un stock entero igual o mayor a cero.'
            });
        }
        const productos = await Producto.findOne({
            where: {
                id: id
            }
        });
        if (!productos) {
            return res.status(401).json({ message: 'El producto no existe' })
        }
        await Producto.update(
            {
                nombre: nombre,
                precio: precio,
                stock: stock,
                estado: stock > 5 ? "en stock" : stock > 0 ? "stock bajo" : "sin stock"
            },

            {
                where: {
                    id: id
                }
            }


        );
        return res.status(200).json({ message: 'Producto actualizado correctamente' })

    } catch (error) {
        return res.status(401).json({ message: 'no se pudo actualizar el producto' })
    }
}


export async function productosDelete(req, res) {
    try {
        const id = req.params.id;
        const productos = await Producto.findOne({
            where: {
                id: id
            },
        });
        if (!productos) {
            return res.status(401).json({ message: 'El producto no existe' })
        }
        await Producto.destroy({
            where: {
                id: id
            }
        })
        return res.status(200).json({ message: 'Producto eliminado correctamente' })
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar el producto' })
    }
}



export async function comprasAdmin(req, res) {
    try {

        const { producto_id, fecha, cantidad, precio_compra } = req.body;

        if (!producto_id || !fecha || !cantidad || !precio_compra) {
            return res.status(400).json({
                message: 'Todos los campos son obligatorios'
            });
        }

        const producto = await Producto.findOne({
            attributes: ['id', 'stock'],
            where: {
                id: producto_id
            }
        });

        if (!producto) {
            return res.status(404).json({
                message: 'El producto no existe'
            });
        }

        const compra = await Compra.create({
            producto_id,
            fecha,
            cantidad,
            precio_compra,
            total: precio_compra * cantidad
        });

        producto.stock = producto.stock + cantidad;

        await producto.save();

        return res.status(201).json({
            message: 'Compra realizada correctamente',
            compra,
            stock_actual: producto.stock
        });

    } catch (error) {

       

        return res.status(500).json({
            message: 'No se pudo realizar la compra'
        });
    }
}

export async function historialCompras(req, res) {
    try {
        const historial = await Compra.findAll({
            include: [
                {
                    model: Producto,
                    attributes: ['nombre']
                }

            ],
            order: [
                ['fecha', 'DESC']
            ]
        });
        return res.json(historial)

    } catch (error) {
        return res.status(500).json({
            message: 'No se pudo obtener el historial de compras'
        });
    }
}
