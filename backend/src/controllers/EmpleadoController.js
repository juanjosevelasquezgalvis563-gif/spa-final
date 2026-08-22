import db from '../config/db.js';

export async function empleado(req, res) {
    try {
        const empleadoId = req.user.id;

        const [citas] = await db.promise().query(
            `SELECT
        citas.id,
        citas.fecha,
        citas.hora,
        citas.estado,
        usuarios.nombre AS nombre_cliente,
        servicios.nombre AS nombre_servicio
        FROM citas
        INNER JOIN usuarios 
        ON citas.usuario_id = usuarios.id
        INNER JOIN servicios
        ON citas.servicio_id = servicios.id
        WHERE empleado_id =?`,
         [empleadoId]

        );
        res.json(citas);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


export async function citasHoy(req, res) {
    try {
        const empleadoId = req.user.id;
        const [citasHoy] = await db.promise().query(
            `SELECT COUNT(citas.id) as Hoy 
             FROM citas 
             WHERE empleado_id = ? 
             AND DATE(fecha) = DATE(CONVERT_TZ(NOW(), '+00:00', '-05:00'))`,
            [empleadoId]

        );
        res.json(citasHoy[0]);

    } catch (error) {
        return res.status(500).json({ error: "no se pudo obtener las citas de hoy" });
    }
}

export async function citasPendientesEmpleado(req, res) {
    try {
        const empleadoId = req.user.id;
        const [citasPendientes] = await db.promise().query(
            `SELECT COUNT(citas.id) as Pendientes FROM citas WHERE empleado_id = ? AND estado = ?`,
            [empleadoId, 'pendiente']
        );
        res.json(citasPendientes[0])

    } catch (error) {
        return res.status(500).json({ error: "no se pudo obtener las citas pendientes" });
    }
}

export async function citasFinalizadasEmpleado(req,res){
    try{
        const empleadoId = req.user.id;
        const[citasFinalizadas] = await db.promise().query(
            `SELECT COUNT(citas.id) as Finalizadas FROM citas WHERE empleado_id = ? AND estado = ?`,
            [empleadoId,'finalizada']
        );
        res.json(citasFinalizadas[0])
    }catch(error){
        return res.status(500).json({ error: "no se pudo obtener las citas finalizadas" });
    }
}


export async function comfirmarCita(req, res) {
    try {
        const id = req.params.id;
        const[cita] = await db.promise().query(
            'SELECT estado FROM citas WHERE id = ?',
            [id]
        );
        if(cita.length === 0){
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        const citas = cita[0];
        
        if(citas.estado === 'confirmada'){
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta confirmada' });
        }

        if(citas.estado === 'finalizada'){
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta finalizada' });
        }

        if(citas.estado === 'cancelada'){
            return res.status(400).json({ message: 'No se puede confirmar una cita que ya esta cancelada' });
        }
        await db.promise().query(
            'UPDATE citas SET estado = ? WHERE id = ?',
            ['confirmada', id]
        );

        return res.status(200).json({ message: 'Cita confirmada' });

    } catch (error) {
        return res.status(401).json({ error: 'error al comfirmar la cita' });
    }

}

export async function cancelarCita(req, res) {
    try {
        const id = req.params.id;
        const[cita] = await db.promise().query(
            'SELECT estado FROM citas WHERE id = ?',
            [id]
        );
        if(cita.length === 0){
            return res.status(404).json({message: 'Cita no encontrada'});
        }
        const citas = cita[0];
        if(citas.estado === 'finalizada'){
            return res.status(401).json({message: 'No se puede cancelar una cita finalizada'});
        }
        if(citas.estado === 'cancelada'){
            return res.status(400).json({ message: 'No se puede finalizar una cita que ya esta cancelada' });
            
        }

        await db.promise().query(
            'UPDATE citas SET estado = ? WHERE id = ?',
            ['cancelada', id]
        );
        return res.status(200).json({ message: "Cita cancelada" });
    } catch (error) {
        return res.status(500).json({ error: "No se pudo cancelar la cita" });
    }

}

export async function finalizarCita(req, res) {
    try {
        const id = req.params.id;
        await db.promise().query(
            'UPDATE citas SET estado = ? WHERE id = ?',
            ['finalizada', id]
        );
        return res.status(200).json({ message: 'Cita finalizada' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al finalizar la cita' });
    }
}

export async function citaRealizarEmpleado(req,res){
    try{

     const empleadoId = req.user.id;
    const[citas] = await db.promise().query(
        `
        select 
         citas.id,
         citas.fecha,
         citas.hora,
         usuarios.nombre as cliente,
         servicios.nombre as servicio,
         citas.estado
       from citas
       join usuarios
       on citas.usuario_id = usuarios.id
       join servicios
       on citas.servicio_id = servicios.id
         where empleado_id = ? and citas.estado in('pendiente','confirmada')
       order by
         citas.fecha asc,
         citas.hora asc,
      case
      when citas.estado = 'pendiente' then 1
      when citas.estado = 'confirmada' then 2
      end
      limit 1 `,
      [empleadoId]
    );
    res.json(citas[0]);

    }catch(error){
        return res.status(403).json({error:"no se pudieron obtener las citas"})
    }
}