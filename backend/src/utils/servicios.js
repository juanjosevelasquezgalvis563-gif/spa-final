const EMPLEADO_ESPECIALIDAD = {
    "valentina alvarez": "manicurista",
    "melany arango": "manicurista",
    "evelyn nino": "estilista",
    "steven piedradita": "estilista",
    "steven piedrahita": "estilista"
};

const SERVICIO_ESPECIALIDAD = {
    manicurista: [
        "uñas", "manicure", "manicura", "pedicure", "pedispa", "dipping",
        "rubber", "builder", "gel", "soft gel", "esculpidas", "retiro",
        "poly", "press", "nail", "nail art", "acrilicas"
    ],
    estilista: [
        "corte", "cepillado", "keratina", "tinte", "peinado", "maquillaje",
        "cabello", "color", "alisado", "estilo", "pestañas", "cejas",
        "depilacion", "hidratacion", "lifting", "laminado", "balayage",
        "social", "facial", "porcelanizacion", "limpieza"
    ]
};

const normalizarTexto = (valor = "") => String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function puedeRealizarServicio(empleado, servicio) {
    const especialidadEmpleado = EMPLEADO_ESPECIALIDAD[normalizarTexto(empleado?.nombre || "")];
    const nombreServicio = normalizarTexto(servicio?.nombre || "");

    if (!especialidadEmpleado || !nombreServicio) return true;

    const especialidadServicio = Object.entries(SERVICIO_ESPECIALIDAD)
        .find(([, palabras]) => palabras.some((palabra) => nombreServicio.includes(palabra)))?.[0];

    return !especialidadServicio || especialidadEmpleado === especialidadServicio;
}
