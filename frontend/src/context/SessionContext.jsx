import { useCallback, useEffect, useRef, useState } from "react";
import { API_ROOT } from "../lib/api";
import { SessionContext } from "./useSession";

const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_HEARTBEAT_MS = 4 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "velure:lastActivity";
const SESSION_EVENT_STORAGE_KEY = "velure:sessionEvent";

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(0);

  const publishSessionEvent = useCallback((event) => {
    localStorage.setItem(SESSION_EVENT_STORAGE_KEY, `${event}:${Date.now()}`);
  }, []);

  const setAuthenticatedUser = useCallback((authenticatedUser) => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    localStorage.setItem(SESSION_EVENT_STORAGE_KEY, `login:${now}`);
    setUser(authenticatedUser);
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch(`${API_ROOT}/inser/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cerrar la sesión.");
    }

    setUser(null);
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    publishSessionEvent("logout");
  }, [publishSessionEvent]);

  useEffect(() => {
    let vigente = true;

    async function verificarSesion() {
      try {
        const response = await fetch(`${API_ROOT}/inser/me`, {
          credentials: "include",
        });

        if (!response.ok) return;

        const data = await response.json();
        if (vigente && data.user) {
          const now = Date.now();
          const actividadGuardada = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
          const ultimaActividad = Number.isFinite(actividadGuardada) && actividadGuardada > 0
            ? actividadGuardada
            : now;

          if (now - ultimaActividad >= SESSION_IDLE_TIMEOUT_MS) {
            localStorage.removeItem(ACTIVITY_STORAGE_KEY);
            publishSessionEvent("timeout");
            const logoutResponse = await fetch(`${API_ROOT}/inser/logout`, {
              method: "POST",
              credentials: "include",
            });
            if (!logoutResponse.ok) {
              throw new Error("No se pudo cerrar la sesión inactiva.");
            }
            return;
          }

          lastActivityRef.current = ultimaActividad;
          if (!Number.isFinite(actividadGuardada) || actividadGuardada <= 0) {
            localStorage.setItem(ACTIVITY_STORAGE_KEY, String(ultimaActividad));
          }
          setUser(data.user);
        }
      } catch (error) {
        console.error("No se pudo verificar la sesión:", error);
      } finally {
        if (vigente) setLoading(false);
      }
    }

    void verificarSesion();

    return () => {
      vigente = false;
    };
  }, [publishSessionEvent]);

  useEffect(() => {
    let vigente = true;

    const recibirEventoSesion = (event) => {
      if (event.key !== SESSION_EVENT_STORAGE_KEY || !event.newValue) return;

      if (event.newValue.startsWith("logout:") || event.newValue.startsWith("timeout:")) {
        setUser(null);
        return;
      }

      if (event.newValue.startsWith("login:")) {
        fetch(`${API_ROOT}/inser/me`, { credentials: "include" })
          .then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            if (vigente && data.user) setUser(data.user);
          })
          .catch((error) => {
            console.error("No se pudo sincronizar la sesión:", error);
          });
      }
    };

    window.addEventListener("storage", recibirEventoSesion);
    return () => {
      vigente = false;
      window.removeEventListener("storage", recibirEventoSesion);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const now = Date.now();
    const actividadCompartida = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    lastActivityRef.current = Math.max(
      lastActivityRef.current,
      Number.isFinite(actividadCompartida) ? actividadCompartida : 0,
      now
    );
    let ultimaActividadPersistida = lastActivityRef.current;
    let ultimoHeartbeat = now;
    let heartbeatEnCurso = false;
    let vigente = true;

    const registrarActividad = () => {
      const actividadActual = Date.now();
      lastActivityRef.current = actividadActual;

      if (actividadActual - ultimaActividadPersistida >= 1000) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(actividadActual));
        ultimaActividadPersistida = actividadActual;
      }

      if (actividadActual - ultimoHeartbeat < SESSION_HEARTBEAT_MS || heartbeatEnCurso) return;

      ultimoHeartbeat = actividadActual;
      heartbeatEnCurso = true;
      fetch(`${API_ROOT}/inser/me`, { credentials: "include" })
        .then(async (response) => {
          if (response.status === 401 || response.status === 403) {
            if (vigente) {
              setUser(null);
              localStorage.removeItem(ACTIVITY_STORAGE_KEY);
              publishSessionEvent("timeout");
            }
            return;
          }
          if (!response.ok) {
            throw new Error("No se pudo renovar la sesión.");
          }

          const data = await response.json();
          if (vigente && data.user) setUser(data.user);
        })
        .catch((error) => {
          console.error("No se pudo renovar la sesión:", error);
        })
        .finally(() => {
          heartbeatEnCurso = false;
        });
    };

    let expiracionIniciada = false;
    const revisarInactividad = () => {
      const actividadCompartida = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
      if (Number.isFinite(actividadCompartida)) {
        lastActivityRef.current = Math.max(lastActivityRef.current, actividadCompartida);
      }

      if (!expiracionIniciada && Date.now() - lastActivityRef.current >= SESSION_IDLE_TIMEOUT_MS) {
        expiracionIniciada = true;
        setUser(null);
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
        publishSessionEvent("timeout");
        fetch(`${API_ROOT}/inser/logout`, {
          method: "POST",
          credentials: "include",
        }).then((response) => {
          if (!response.ok) throw new Error("No se pudo cerrar la sesión inactiva.");
        }).catch((error) => {
          console.error("No se pudo cerrar la sesión inactiva:", error);
        });
      }
    };

    const activityEvents = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registrarActividad, { passive: true });
    });
    const inactivityTimer = window.setInterval(revisarInactividad, 1000);

    return () => {
      vigente = false;
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, registrarActividad);
      });
      window.clearInterval(inactivityTimer);
    };
  }, [publishSessionEvent, user]);

  return (
    <SessionContext.Provider value={{ user, loading, setAuthenticatedUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
