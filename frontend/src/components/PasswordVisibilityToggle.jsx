import "./PasswordVisibilityToggle.css";

export default function PasswordVisibilityToggle({ visible, onToggle }) {
  return (
    <button
      className="password-visibility-toggle"
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
    >
      {visible ? "Ocultar" : "Mostrar"}
    </button>
  );
}
