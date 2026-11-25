
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/image.png";
import { API_ROOT } from "../lib/api";
import "./Registro.css";
import PasswordVisibilityToggle from "./PasswordVisibilityToggle";

function useTurnstile(siteKey) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [widgetId, setWidgetId] = useState(null);
    const [token, setToken] = useState("");

    const containerRef = useRef(null);

    const loadScript = useCallback(() => {
        setError(null);

        if (!siteKey) {
            setError("No pudimos iniciar la verificación. Actualiza la página e inténtalo de nuevo.");
            return;
        }

        if (window.turnstile) {
            setLoaded(true);
            return;
        }

        let script = document.getElementById("cloudflare-turnstile");

        if (!script) {
            script = document.createElement("script");
            script.id = "cloudflare-turnstile";
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const handleLoad = () => {
            setLoaded(true);
            setError(null);
        };

        const handleError = () => {
            setLoaded(false);
            setError("No se pudo cargar la verificación de seguridad. Comprueba tu conexión.");
        };

        if (script.dataset.loaded === "true" && window.turnstile) {
            setLoaded(true);
            return;
        }

        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });

    }, [siteKey]);

    useEffect(() => {
        loadScript();
    }, [loadScript]);

    useEffect(() => {
        if (
            !loaded ||
            !siteKey ||
            !containerRef.current ||
            !window.turnstile ||
            widgetId !== null
        ) {
            return;
        }

        try {
            const id = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: (receivedToken) => {
                    setToken(receivedToken);
                    setError(null);
                },
                "error-callback": () => {
                    setToken("");
                    setError("Error al completar la verificación de seguridad. Inténtalo de nuevo.");
                },
                "expired-callback": () => {
                    setToken("");
                }
            });

            setWidgetId(id);

        } catch (error) {
            console.error("Error al renderizar Turnstile:", error);
            setError("No se pudo mostrar la verificación de seguridad.");
        }

    }, [loaded, siteKey, widgetId]);

    const reset = useCallback(() => {
        setToken("");
        setError(null);

        if (window.turnstile && widgetId !== null) {
            window.turnstile.reset(widgetId);
        }
    }, [widgetId]);

    const retry = useCallback(() => {
        setToken("");
        setError(null);

        if (window.turnstile && widgetId !== null) {
            window.turnstile.reset(widgetId);
            return;
        }

        const existing = document.getElementById("cloudflare-turnstile");

        if (existing) {
            existing.remove();
        }

        setLoaded(false);
        loadScript();

    }, [widgetId, loadScript]);

    return {
        loaded,
        error,
        token,
        containerRef,
        reset,
        retry
    };
}

export function Registro() {
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [cargando, setCargando] = useState(false);

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    const {
        loaded: turnstileLoaded,
        error: turnstileError,
        token: turnstileToken,
        containerRef: turnstileRef,
        reset: resetTurnstile,
        retry: retryTurnstile
    } = useTurnstile(siteKey);

    const limpiarCampos = () => {
        setNombre("");
        setTelefono("");
        setEmail("");
        setPassword("");
        setMostrarPassword(false);
    };

    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            setMessage("");
        }, 5000);

        return () => clearTimeout(timer);
    }, [message]);

    async function handleSubmit(e) {
        e.preventDefault();

        if (cargando) return;

        setMessage("");

        if (!siteKey) {
            setMessage("No pudimos iniciar la verificación. Actualiza la página e inténtalo de nuevo.");
            return;
        }

        if (!turnstileToken) {
            setMessage("Debes completar la verificación de seguridad antes de registrarte.");
            return;
        }

        setCargando(true);

        try {
            const payload = {
                nombre,
                telefono,
                email: email.trim(),
                password,
                turnstileToken
            };

            const response = await fetch(`${API_ROOT}/inser/registrar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setMessage(data.message || "No se pudo registrar el usuario.");
                resetTurnstile();
                return;
            }

            limpiarCampos();
            resetTurnstile();

            setMessage(
                data.message || "Usuario registrado exitosamente. Ya puedes iniciar sesión."
            );

        } catch (error) {
            console.error("Error de conexión:", error);
            setMessage("No pudimos crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.");
            resetTurnstile();

        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="registro-container auth-page auth-page-register">
            <div className="auth-layout">

                <aside className="auth-brand-panel auth-brand-panel-register">
                    <div className="auth-brand">
                        <img src={logo} alt="JC Alta Peluquería" />
                        <span>JC Alta Peluquería</span>
                    </div>

                    <div className="auth-brand-copy">
                        <span className="auth-eyebrow">
                            BIENVENIDA A TU NUEVO RITUAL
                        </span>

                        <h1>Tu momento de cuidarte empieza aquí.</h1>

                        <p>
                            Crea tu cuenta para reservar tus servicios y vivir una
                            experiencia de belleza hecha para ti.
                        </p>
                    </div>

                    <div className="auth-brand-detail" aria-hidden="true">
                        <span>JC</span>
                    </div>

                    <p className="auth-brand-caption">
                        Tu belleza, nuestro arte.
                    </p>
                </aside>

                <form
                    className="registro-form auth-card auth-card-register"
                    onSubmit={handleSubmit}
                >
                    <div className="auth-form-heading">
                        <span className="auth-eyebrow">
                            ÚNETE A NOSOTROS
                        </span>

                        <h2 className="registro-title">
                            Crear cuenta
                        </h2>

                        <p>
                            Completa tus datos para comenzar.
                        </p>
                    </div>

                    <input
                        className="registro-input"
                        type="text"
                        placeholder="Nombre"
                        autoComplete="name"
                        aria-label="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />

                    <input
                        className="registro-input"
                        type="tel"
                        placeholder="Teléfono"
                        autoComplete="tel"
                        aria-label="Teléfono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        required
                    />

                    <input
                        className="registro-input"
                        type="email"
                        placeholder="Correo electrónico"
                        autoComplete="email"
                        autoCapitalize="none"
                        maxLength={254}
                        aria-label="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div className="password-field">
                        <input
                            className="registro-input"
                            type={mostrarPassword ? "text" : "password"}
                            placeholder="Contraseña"
                            autoComplete="new-password"
                            aria-label="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <PasswordVisibilityToggle
                            visible={mostrarPassword}
                            onToggle={() =>
                                setMostrarPassword((visible) => !visible)
                            }
                        />
                    </div>

                    <div className="turnstile-container">
                        <div ref={turnstileRef} />

                        {turnstileError && (
                            <p className="turnstile-status error" role="alert">
                                {turnstileError}
                            </p>
                        )}

                        {turnstileError && (
                            <button
                                className="registro-captcha-refresh"
                                type="button"
                                onClick={retryTurnstile}
                            >
                                Reintentar verificación
                            </button>
                        )}
                    </div>

                    <button
                        className="registro-button"
                        type="submit"
                        disabled={cargando || !turnstileToken || !turnstileLoaded}
                    >
                        {cargando ? "Registrando..." : "Registrarse"}
                    </button>

                    {message && (
                        <p className="registro-message" role="status">
                            {message}
                        </p>
                    )}

                    <p className="auth-switch">
                        ¿Ya tienes cuenta?{" "}
                        <Link to="/login">
                            Inicia sesión
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Registro;
