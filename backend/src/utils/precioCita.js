/**
 * Calcula el desglose de precio de una cita:
 *  - precio original del servicio
 *  - descuento por fidelización (si lo hay)
 *  - precio final (con descuento)
 *  - reserva ya pagada en línea
 *  - saldo que se cobra en el salón
 *
 * @param {object} cita          
 * @param {object} servicio      
 * @param {object|null} reservaPagada  
 */
export function desglosarPrecioCita(cita, servicio, reservaPagada) {
    const precioServicio = Math.round(Number(servicio?.precio) || 0);
    

    const precioOriginal = Number(cita?.precio_original) > 0
        ? Math.round(Number(cita.precio_original))
        : precioServicio;

    const descuentoPorcentaje = Number(cita?.descuento_porcentaje) || 0;
    const descuentoBruto = Math.round(Number(cita?.descuento_valor) || 0);
    const descuento = Math.min(Math.max(0, descuentoBruto), precioOriginal);

    const precioFinal = Math.max(0, precioOriginal - descuento);

    const reservaBruta = Math.round(Number(reservaPagada?.monto_reserva) || 0);
    const reserva = Math.min(Math.max(0, reservaBruta), precioFinal);

    return {
        precioOriginal,
        descuentoPorcentaje,
        descuentoBruto,
        descuento,
        precioFinal,
        reservaPagada: reserva,
        saldo: precioFinal - reserva
        
    };
}