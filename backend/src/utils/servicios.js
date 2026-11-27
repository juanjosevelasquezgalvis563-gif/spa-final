
const EMPLEADO_ESPECIALIDAD = {
    "melany arango": "manicurista",
    "juliana correa": "manicurista",
    "mariangel": "ambas",
    "steven piedrahita": "estilista",
    "steven piedradita": "estilista",
    "stiven piedrahita": "estilista",
    "stiven piedradita": "estilista",
    "evelyn nino": "estilista",
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

    const especialidadEmpleado = nombreEmpleado.split(" ").includes("mariangel")
        ? "ambas"
        : EMPLEADO_ESPECIALIDAD[nombreEmpleado];

  
    const especialidadServicio = obtenerEspecialidadServicio(servicio);

    // Los servicios no clasificados de los profesionales nombrados se tratan
    // como servicios de estilista; los demás empleados no reciben servicios
    // clasificados si no tienen una especialidad asignada.
    if (!especialidadEmpleado) return !especialidadServicio;
    const grupoServicio = especialidadServicio || "estilista";
    if (especialidadEmpleado === "ambas") return true;
    return especialidadEmpleado === grupoServicio;
}
