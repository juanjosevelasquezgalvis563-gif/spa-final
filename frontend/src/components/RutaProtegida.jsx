import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Protege una ruta verificando la sesión real contra el backend.
 *
 * El token se guarda en una cookie httpOnly, por lo que no se
 * puede leer desde el navegador. La forma correcta de saber si la
 * sesión es válida es consultando el endpoint /me.
 *
 * @param children  componente a renderizar si el acceso es válido
 * @param rol       rol permitido: "cliente", "empleado" o "administrador"
 */
export function RutaProtegida({ children, rol }) {
  const location = useLocation();
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    let vigente = true;

    async function verificar() {
      try {
        const response = await fetch("http://localhost:3000/inser/me", {
          method: "GET",
          credentials: "include",
        });

        // 401 o 403: no hay sesión válida o el rol no corresponde.
        if (response.status === 401 || response.status === 403) {
          if (vigente) setEstado("denegado");
          return;
        }

        if (!response.ok) {
          if (vigente) setEstado("permitido");
          return;
        }

        const data = await response.json();
        const usuario = data.user;
        const perfilId = new URLSearchParams(location.search).get("perfilId");

        const administradorEnPerfil = usuario?.rol === "administrador" && Boolean(perfilId);
        if (rol && usuario?.rol !== rol && !administradorEnPerfil) {
          if (vigente) setEstado("denegado");
          return;
        }

        if (vigente) setEstado("permitido");
      } catch (error) {
        if (vigente) setEstado("denegado");
      }
    }

    verificar();

    return () => {
      vigente = false;
    };
  }, [rol, location.search]);

  if (estado === "cargando") {
    return (
      <div className="ruta-cargando">
        <p>Verificando sesión...</p>
      </div>
    );
  }

  if (estado === "denegado") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default RutaProtegida;