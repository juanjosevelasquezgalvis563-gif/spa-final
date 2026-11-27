const apiConfigurada = import.meta.env.VITE_API_URL || "https://spa-final.onrender.com";

// En producción usa el mismo origen para que Safari no trate la cookie de sesión
// como una cookie de terceros. Vercel reescribe estas rutas hacia Render.
export const API_ROOT = import.meta.env.PROD
    ? ""
    : apiConfigurada.replace(/\/+$/, "");
