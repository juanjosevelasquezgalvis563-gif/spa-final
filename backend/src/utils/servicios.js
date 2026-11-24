
const EMPLEADO_ESPECIALIDAD = {
    "Melany arango": "manicurista",
    "Juliana correa": "manicurista",
    "Steven piedradita": "estilista",
    "Evelyn nino": "estilista",
};

const SERVICIO_ESPECIALIDAD = {
    manicurista: [
        "uñas",
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
        "decoracion de uñas"
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
        "pestañas",
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

  
    if (!especialidadEmpleado) return false;

   
    const especialidadServicio = obtenerEspecialidadServicio(servicio);

    if (!especialidadServicio) return false;

   
    return especialidadEmpleado === especialidadServicio;
}
