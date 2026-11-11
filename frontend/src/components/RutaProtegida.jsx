import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../context/useSession";

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
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="ruta-cargando">
        <p>Verificando sesión...</p>
      </div>
    );
  }

  const perfilId = new URLSearchParams(location.search).get("perfilId");
  const administradorEnPerfil = user?.rol === "administrador" && Boolean(perfilId);
  if (!user || (rol && user.rol !== rol && !administradorEnPerfil)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default RutaProtegida;