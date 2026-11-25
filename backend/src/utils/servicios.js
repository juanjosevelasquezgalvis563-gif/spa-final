
const EMPLEADO_ESPECIALIDAD = {
    "melany arango": "manicurista",
    "juliana correa": "manicurista",
    "valentina alvarez": "manicurista",
    "steven piedrahita": "estilista",
    "steven piedradita": "estilista",
    "stiven piedrahita": "estilista",
    "evelyn nino": "estilista",
    "jennifer correa": "estilista",
};

const SERVICIO_ESPECIALIDAD = {
    manicurista: [
        "unas",
        "manicure",
        "manicura",
        "pedicure",
        "pedispa",
        "dipping",
        "rubber",
        "builder",
        "gel",
        "soft gel",
        "esculpidas",
        "retiro",
        "poly",
        "press",
        "nail",
        "nail art",
        "acrilicas",
        "acrilica",
        "acrilico",
        "semipermanente",
        "decoracion de unas"
    ],

    estilista: [
        "corte",
        "cepillado",
        "keratina",
        "tinte",
        "peinado",
        "maquillaje",
        "cabello",
        "color",
        "alisado",
        "estilo",
        "pestanas",
        "cejas",
        "depilacion",
        "hidratacion",
        "lifting",
        "laminado",
        "balayage",
        "social",
        "facial",
        "porcelanizacion",
        "limpieza"
    ]
};


const normalizarTexto = (valor = "") =>
    String(valor)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ");


function obtenerEspecialidadServicio(servicio) {
    const nombreServicio = normalizarTexto(servicio?.nombre || "");

    if (!nombreServicio) return null;

    for (const [especialidad, palabras] of Object.entries(SERVICIO_ESPECIALIDAD)) {
        if (palabras.some(palabra =>
            nombreServicio.includes(normalizarTexto(palabra))
        )) {
            return especialidad;
        }
    }

    return null;
}


export function puedeRealizarServicio(empleado, servicio) {
    const nombreEmpleado = normalizarTexto(empleado?.nombre || "");

    const especialidadEmpleado = EMPLEADO_ESPECIALIDAD[nombreEmpleado];

  
    const especialidadServicio = obtenerEspecialidadServicio(servicio);

    // La tabla usuarios no guarda una especialidad. Si el nombre del empleado
    // o del servicio no está en el catálogo conocido, no se debe bloquear la cita.
    if (!especialidadEmpleado || !especialidadServicio) return true;

    return especialidadEmpleado === especialidadServicio;
}
