import db from '../config/db.js';

export async function cliente(req, res) {

    try {
        const { fecha, hora, usuario_id, empleado_id, servicio_id } = req.body;
        if (!fecha || !hora || !usuario_id || !empleado_id || !servicio_id) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        const [horaExistente] = await db.promise().query(
            'SELECT * FROM citas WHERE fecha=? AND hora =? AND empleado_id =?',
            [fecha,hora, empleado_id]
        );
        if (horaExistente.length > 0) {
            return res.status(400).json({ error: 'El empleado ya tiene una cita a esa hora, Por favor ingresa otra hora' });
        }
        await db.promise().query(
            'INSERT INTO citas (fecha, hora, usuario_id, empleado_id, servicio_id) VALUES (?, ?, ?, ?, ?)',
            [fecha, hora, usuario_id, empleado_id, servicio_id]
        );
        return res.status(201).json({ message: 'Cita creada exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export async function obtenerCliente(req, res) {
    try {

        const usuarioId = req.user.id;

        const [clientes] = await db.promise().query(
            `SELECT
             citas.id,
             citas.fecha,
             citas.hora,
             citas.estado,
             usuarios.nombre AS nombre_cliente,
             servicios.nombre AS servicio_ofrecido
             FROM citas
             INNER JOIN usuarios
             ON citas.usuario_id = usuarios.id
             INNER JOIN servicios
             ON citas.servicio_id = servicios.id
             WHERE citas.usuario_id = ?
             ORDER BY
             citas.fecha,
             citas.hora
             ASC`,
             
            [usuarioId]

        );
        res.json(clientes);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export async function cancelarSuCita(req, res) {
    try {
        const id = req.params.id;
        const[citas] = await db.promise().query(
            'SELECT estado FROM citas WHERE id = ?',
            [id]
        );
        if(citas.length === 0){
            return res.status(403).json({ message: 'Cita no encontrada' });
        }
        
        const cita = citas[0];
        if(cita.estado === 'finalizada'){
            return res.status(403).json({ message: 'No se puede cancelar una cita finalizada' });
        }
        await db.promise().query(
            'UPDATE citas SET estado = ? WHERE id = ?',
            ['cancelada', id]
        );

        return res.json({ message: 'Cita cancelada exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: "Error al cancelar su cita" });
    }

}

export async function actualizarCita(req, res) {
    try {
        const id = req.params.id;
        const { fecha, hora, empleado_id, servicio_id} = req.body;
        const [citas] = await db.promise().query(
            'SELECT estado FROM citas WHERE id=?',
            [id]
        );

        if(citas.length === 0){
            return res.status(403).json({ message: 'Cita no encontrada' });
        }

        const cita = citas[0];

        if(cita.estado === 'finalizada'){
            return res.status(403).json({ message: 'No se puede reprogramar una cita finalizada' });
        }
        if(cita.estado === 'cancelada'){
            return res.status(403).json({ message: 'No se puede reprogramar una cita cancelada' });
        }

        await db.promise().query(
            'UPDATE citas SET fecha=?,hora=? ,empleado_id=?, servicio_id=?,estado=? WHERE id=?',
            [fecha, hora, empleado_id, servicio_id,'pendiente', id]
        );
        return res.status(200).json({ message: 'Cita actualizada exitosamente' });
        

    } catch (error) {
        return res.status(403).json({ error: "No se pudo actualizar tu cita" });
    }
}

export async function cantidadDeCitas(req, res) {
    try {
        const usuarioId = req.user.id;
        const [CantidadCitas] = await db.promise().query(
            'SELECT COUNT(citas.id) as total_citas FROM citas WHERE usuario_id=?',
            [usuarioId]
        );
        res.json(CantidadCitas[0]);

    } catch (error) {
        return res.status(500).json({ error: "No se pudo obtener la cantidad de citas" });
    }
}

export async function citasPendientes(req, res) {
    try {
        const usuarioId = req.user.id;
        const [CitasPendientes] = await db.promise().query(
            'SELECT COUNT(citas.id) as citas_pendientes FROM citas WHERE usuario_id=? AND estado=?',
            [usuarioId, 'pendiente']
        );
        res.json(CitasPendientes[0]);
    } catch (error) {
        return res.status(500).json({ error: "No se pudo obtener la cantidad de citas pendientes" });
    }
}

export async function citasComfirmadas(req, res) {
    try {
        const usuarioId = req.user.id;
        const [CitasComfirmadas] = await db.promise().query(
            'SELECT COUNT(citas.id) as citas_confirmadas FROM citas WHERE usuario_id=? AND estado=?',
            [usuarioId, 'confirmada']
        );
        res.json(CitasComfirmadas[0]);
    } catch (error) {
        return res.status(500).json({ error: "No se pudo obtener la cantidad de citas comfrimadas" });
    }
}

export async function citasFinalizadas(req, res) {
    try {
        const usuarioId = req.user.id;
        const [CitasFinalizadas] = await db.promise().query(
            'SELECT COUNT(citas.id) as citas_finalizadas FROM citas WHERE usuario_id=? AND estado=?',
            [usuarioId, 'finalizada']
        );
        res.json(CitasFinalizadas[0]);
    } catch (error) {
        return res.status(500).json({ error: "No se pudo obtener la cantidad de citas finalizadas" });
    }
}

export async function CitaRealizar(req, res) {
    try {
        const usuarioId = req.user.id;
        const [CitaRealizar] = await db.promise().query(
            `
            SELECT
               citas.id,
               citas.fecha,
               citas.hora,
               servicios.nombre AS servicio,
               usuarios.nombre AS empleado,
               citas.estado
            FROM citas
            INNER JOIN usuarios
            ON citas.empleado_id = usuarios.id
            INNER JOIN servicios
            ON citas.servicio_id = servicios.id
            WHERE citas.usuario_id = ?
            AND citas.estado IN ('pendiente', 'confirmada')
            ORDER BY
            citas.fecha ASC,
            citas.hora ASC,
            CASE
            WHEN estado = 'confirmada' THEN 1
            WHEN estado = 'pendiente' THEN 2
            END
            LIMIT 1 `,
            [usuarioId]
        );
        res.json(CitaRealizar[0]);

    } catch (error) {
        return res.status(401).json({ error: "No se pudo obtener la sigueinte cita a realizar" });
    }
}

export async function ultimasCitas(req, res) {
   try{
     const usuarioId = req.user.id;
    const [citas] = await db.promise().query(
        `SELECT 
           citas.id,
           citas.fecha,
           citas.hora,
           usuarios.nombre as empleado,
           servicios.nombre as servicio,
           citas.estado
          FROM citas
            JOIN usuarios
           ON citas.empleado_id = usuarios.id
            JOIN servicios
           ON citas.servicio_id = servicios.id
           WHERE citas.usuario_id = ?
          order by 
          citas.fecha DESC,
          citas.hora DESC`,
       [usuarioId]
    );
    res.json(citas);
   }catch(error){
    return res.status(401).json({ error: "No se pudo obtener las ultimas citas" });
   }
}
