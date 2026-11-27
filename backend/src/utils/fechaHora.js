export function fechaActualBogota(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(ahora);
    const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return `${valores.year}-${valores.month}-${valores.day}`;
}

export function horarioAtencionValido(hora) {
    const coincidencia = /^(?:([01]\d|2[0-3])):([0-5]\d)(?::([0-5]\d))?$/.exec(hora || "");
    if (!coincidencia) return false;

    const segundosDelDia = Number(coincidencia[1]) * 3600
        + Number(coincidencia[2]) * 60
        + Number(coincidencia[3] || 0);
   
    return segundosDelDia >= 8 * 3600 && segundosDelDia <= 17 * 3600;
}

export function validarFechaHoraReserva(fecha, hora, ahora = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "") || fecha < fechaActualBogota(ahora)) {
        return false;
    }

    const fechaValida = new Date(`${fecha}T00:00:00.000Z`);
    if (!Number.isFinite(fechaValida.getTime()) || fechaValida.toISOString().slice(0, 10) !== fecha) {
        return false;
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora || "")) {
        return false;
    }
    if (!horarioAtencionValido(hora)) return false;

    if (fecha === fechaActualBogota(ahora)) {
        const partes = new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Bogota",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(ahora);
        const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
        const horaActual = `${valores.hour}:${valores.minute}`;
        if (hora.slice(0, 5) <= horaActual) return false;
    }

    return true;
}

export function normalizarHoraReserva(hora) {
    return hora.length === 5 ? `${hora}:00` : hora;
}

