import { createHash, timingSafeEqual } from "node:crypto";

export function generarFirmaCheckout(referencia, montoCentavos, moneda, expiraEn, secreto) {
    const cadena = `${referencia}${montoCentavos}${moneda}${expiraEn}${secreto}`;
    return createHash("sha256").update(cadena).digest("hex");
}

function obtenerPropiedad(objeto, ruta) {
    return ruta.split(".").reduce((valor, segmento) => {
        if (!valor || typeof valor !== "object" || !Object.hasOwn(valor, segmento)) {
            return undefined;
        }
        return valor[segmento];
    }, objeto);
}

export function verificarFirmaEventoWompi(evento, secreto) {
    const firmaRecibida = evento?.signature?.checksum;
    const propiedades = evento?.signature?.properties;
    const timestamp = evento?.timestamp;

    if (
        typeof firmaRecibida !== "string"
        || !/^[a-f\d]{64}$/i.test(firmaRecibida)
        || !Array.isArray(propiedades)
        || !Number.isInteger(timestamp)
        || typeof secreto !== "string"
        || !secreto
    ) {
        return false;
    }

    const valores = [];
    for (const propiedad of propiedades) {
        if (typeof propiedad !== "string") return false;
        const valor = obtenerPropiedad(evento.data, propiedad);
        if (valor === undefined || valor === null) return false;
        valores.push(String(valor));
    }

    const firmaEsperada = createHash("sha256")
        .update(`${valores.join("")}${timestamp}${secreto}`)
        .digest();
    const firmaActual = Buffer.from(firmaRecibida, "hex");

    return firmaActual.length === firmaEsperada.length
        && timingSafeEqual(firmaActual, firmaEsperada);
}
