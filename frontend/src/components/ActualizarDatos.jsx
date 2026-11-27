import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_ROOT } from "../lib/api";
import { useSession } from "../context/useSession";
import logo from "../assets/image.png";

const CAMPOS_INICIALES = { nombre: "", telefono: "", email: "" };


export function ActualizarDatos() {
  const [datos, setDatos] = useState(CAMPOS_INICIALES);
  const [rolUsuario, setRolUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [canal, setCanal] = useState("correo");
  const [codigo, setCodigo] = useState("");
  const [destino, setDestino] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [message, setMessage] = useState("");
  const [esError, setEsError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useSession();

  useEffect(() => {
    let vigente = true;
    fetch(`${API_ROOT}/inser/actualizar-datos`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "No pudimos cargar tus datos.");
        if (!vigente) return;
        const user = data.user || {};
        setRolUsuario(user.rol || "");
        setDatos({ nombre: user.nombre || "", telefono: user.telefono || "", email: user.email || "" });
        setCanal(user.email ? "correo" : "telefono");
      })
      .catch((error) => {
        if (vigente) {
          setMessage(error.message || "No pudimos cargar tus datos.");
          setEsError(true);
        }
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (segundos <= 0) return undefined;
    const temporizador = window.setTimeout(() => setSegundos((actual) => Math.max(0, actual - 1)), 1000);
    return () => window.clearTimeout(temporizador);
  }, [segundos]);

  useEffect(() => {
    if (!message) return undefined;
    const temporizador = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [message]);

  function cambiarCampo(event) {
    setDatos((actuales) => ({ ...actuales, [event.target.name]: event.target.value }));
  }

  async function solicitarCodigo() {
    setOcupado(true);
    setMessage("");
    setEsError(false);
    try {
      const response = await fetch(`${API_ROOT}/inser/actualizar-datos/codigo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No pudimos enviar el código.");
      setCodigoEnviado(true);
      setDestino(data.message || "Revisa el medio de contacto elegido.");
      setCodigo("");
      setSegundos(Number(data.reenviarEnSegundos) || 60);
      setMessage("Escribe el código de seis dígitos para confirmar que eres tú.");
    } catch (error) {
      setMessage(error.message || "No pudimos enviar el código. Inténtalo de nuevo.");
      setEsError(true);
    } finally {
      setOcupado(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!codigoEnviado) {
      setMessage("Primero solicita el código de verificación.");
      setEsError(true);
      return;
    }
    setOcupado(true);
    setMessage("");
    setEsError(false);
    try {
      const response = await fetch(`${API_ROOT}/inser/registrarr`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, password, codigoVerificacion: codigo.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No pudimos actualizar tus datos.");

      if (data.user) setAuthenticatedUser(data.user);
      setDatos({ ...CAMPOS_INICIALES });
      setMessage(data.message || "Tus datos se actualizaron correctamente.");
      setEsError(false);
      setPassword("");
      setCodigo("");
      setCodigoEnviado(false);
      setDestino("");
      setSegundos(0);
    } catch (error) {
      setMessage(error.message || "No pudimos guardar tus datos. Inténtalo de nuevo.");
      setEsError(true);
    } finally {
      setOcupado(false);
    }
  }

  const rol = rolUsuario || (location.pathname.includes("empleado") ? "empleado" : "cliente");
  const rutaPanel = rol === "administrador" ? "/admin" : rol === "empleado" ? "/empleado" : "/cliente";

  return (
    <main className="registro-container actualizar-datos-page">
      <div className="auth-layout actualizar-datos-layout">
        <aside className="auth-brand-panel actualizar-datos-brand">
          <div className="auth-brand">
            <img src={logo} alt="JC Alta Peluquería" />
            <span>JC Alta Peluquería</span>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">BELLEZA Y BIENESTAR</span>
            <h1>Tu cuenta, siempre al día.</h1>
            <p>Confirma tu identidad y mantén segura la información de tu perfil.</p>
          </div>
          <div className="auth-brand-detail" aria-hidden="true"><span>JC</span></div>
          <p className="auth-brand-caption">Tu belleza, nuestro arte.</p>
        </aside>

      <form className="registro-form auth-card actualizar-datos-form" onSubmit={handleSubmit}>
        <span className="actualizar-datos-eyebrow">SEGURIDAD DE LA CUENTA</span>
        <h1 className="registro-title">Actualiza tus datos</h1>
        <p className="actualizar-datos-intro">Confirma tu identidad con un código enviado a un medio de contacto que ya está registrado en tu cuenta.</p>

        {cargando ? <p role="status">Cargando tus datos…</p> : (
          <>
            <label className="actualizar-datos-campo" htmlFor="actualizar-nombre">
              <span>Nombre</span>
              <input id="actualizar-nombre" className="registro-input" name="nombre" type="text" autoComplete="name" value={datos.nombre} onChange={cambiarCampo} minLength={5} maxLength={15} required />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-telefono">
              <span>Teléfono</span>
              <input id="actualizar-telefono" className="registro-input" name="telefono" type="tel" placeholder="3001234567" autoComplete="tel" value={datos.telefono} onChange={cambiarCampo} pattern="[0-9]{10}" title="Ingresa un número de 10 dígitos" required />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-email">
              <span>Correo electrónico</span>
              <input id="actualizar-email" className="registro-input" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" value={datos.email} onChange={cambiarCampo} required />
            </label>

            <label className="actualizar-datos-campo" htmlFor="actualizar-password">
              <span>Nueva contraseña <small>(opcional)</small></span>
              <input id="actualizar-password" className="registro-input" type="password" placeholder="Déjala vacía para conservarla" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            <fieldset className="actualizar-datos-verificacion">
              <legend>Verifica que eres tú</legend>
              <div className="actualizar-datos-canales">
                <label>
                  <input type="radio" name="canal-verificacion" value="correo" checked={canal === "correo"} onChange={() => { setCanal("correo"); setCodigoEnviado(false); setCodigo(""); setDestino(""); }} />
                  <span>Enviar al correo</span>
                </label>
                <label>
                  <input type="radio" name="canal-verificacion" value="telefono" checked={canal === "telefono"} onChange={() => { setCanal("telefono"); setCodigoEnviado(false); setCodigo(""); setDestino(""); }} />
                  <span>Enviar por mensaje de texto</span>
                </label>
              </div>
              <button className="actualizar-datos-enviar" type="button" onClick={solicitarCodigo} disabled={ocupado || cargando || segundos > 0}>
                {ocupado ? "Enviando…" : segundos > 0 ? `Solicitar otro código en ${segundos}s` : codigoEnviado ? "Enviar otro código" : "Enviar código de verificación"}
              </button>
              {codigoEnviado && <>
                <p className="actualizar-datos-destino" role="status">{destino}</p>
                <label className="actualizar-datos-campo" htmlFor="codigo-verificacion">
                  <span>Código de seis dígitos</span>
                  <input id="codigo-verificacion" className="registro-input actualizar-datos-codigo" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={codigo} onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))} minLength={6} maxLength={6} required />
                </label>
              </>}
            </fieldset>

            <div className="actualizar-datos-acciones">
              <button className="registro-button" type="submit" disabled={ocupado || cargando || !codigoEnviado || codigo.length !== 6}>
                {ocupado ? "Guardando…" : "Confirmar y actualizar"}
              </button>
              <button className="actualizar-datos-cancelar" type="button" onClick={() => navigate(rutaPanel)}>
                Volver al panel
              </button>
            </div>
          </>
        )}

        {message && <p className={`registro-message ${esError ? "actualizar-datos-error" : "actualizar-datos-ok"}`} role={esError ? "alert" : "status"}>{message}</p>}
      </form>
      </div>
    </main>
  );
}

export default ActualizarDatos;
