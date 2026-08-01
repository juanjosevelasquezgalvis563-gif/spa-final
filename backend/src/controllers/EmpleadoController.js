import db from '../config/db.js';

export async function empleado(req,res){
    try{
        const empleadoId = req.user.id;

    const[citas] = await db.promise().query(
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

    }catch(error){
       return res.status(500).json({error: error.message});
    }
}

export async function comfirmarCita(req,res){
   try{
     const id = req.params.id;

    const [resultado] = await db.promise().query(
    'UPDATE citas SET estado = ? WHERE id = ?',
    ['confirmada', id]
);


     return res.status(200).json({message:'Cita confirmada'});

   }catch(error){
    return res.status(401).json({error: 'error al comfirmar la cita'});
   }

}

export async function cancelarCita(req,res){
    try{
        const id = req.params.id;
        await db.promise().query(
            'UPDATE citas SET estado = ? WHERE id = ?',
            ['cancelada',id]
        );
        return res.status(200).json({message: "Cita cancelada"});
    }catch(error){
        return res.status(500).json({error: "No se pudo cancelar la cita"});
    }

}

export async function finalizarCita(req, res) {
    try{
    const id = req.params.id;
    await db.promise().query(
        'UPDATE citas SET estado = ? WHERE id = ?',
        ['Finalizada',id]
    );
    return res.status(200).json({message: 'Cita finalizada'});
    }catch(error){
        return res.status(500).json({error: 'Error al finalizar la cita'});
    }
}