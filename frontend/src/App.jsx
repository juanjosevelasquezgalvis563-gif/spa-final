import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  MotionConfig,
  m,
  useReducedMotion,
} from "motion/react";
import { Route, Routes, useLocation } from "react-router-dom";

import Home from "./Home";
import Registro from "./components/Registro";
import Login from "./components/Login";

import Cliente from "./components/Cliente";
import Reprogramar from "./components/Reprogramar";
import Cita from "./components/Cita";
import MisCitas from "./components/MisCitas";
import ActualizarDatos from "./components/ActualizarDatos";


import Empleado from "./components/Empleado";
import CitasEmpleado from "./components/CitasEmpleado";


import Admin from "./components/Admin";
import RutaProtegida from "./components/RutaProtegida";
import ActualizarProducto from "./components/ActualizarProducto";
import AdminProductos from "./components/AdminProductos";
import CatalogoProductos from "./components/CatalogoProductos";




import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";





function App() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.38,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            style={{ minHeight: "100vh" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/registro" element={<Registro />} />
              <Route
                path="/perfil"
                element={
                  <RutaProtegida rol="cliente">
                    <ActualizarDatos />
                  </RutaProtegida>
                }
              />
              <Route
                path="/actualizar-datos-empleado"
                element={
                  <RutaProtegida rol="empleado">
                    <ActualizarDatos />
                  </RutaProtegida>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route
                path="/forgot-password"
                element={<ForgotPassword />}
              />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route
                path="/cliente"
                element={
                  <RutaProtegida rol="cliente">
                    <Cliente />
                  </RutaProtegida>
                }
              />
              <Route
                path="/cliente/productos"
                element={
                  <RutaProtegida rol="cliente">
                    <CatalogoProductos />
                  </RutaProtegida>
                }
              />
              <Route
                path="/cita"
                element={
                  <RutaProtegida rol="cliente">
                    <Cita />
                  </RutaProtegida>
                }
              />
              <Route
                path="/citas"
                element={
                  <RutaProtegida rol="cliente">
                    <MisCitas />
                  </RutaProtegida>
                }
              />
              <Route
                path="/reprogramar/:id"
                element={
                  <RutaProtegida rol="cliente">
                    <Reprogramar />
                  </RutaProtegida>
                }
              />
              <Route
                path="/empleado"
                element={
                  <RutaProtegida rol="empleado">
                    <Empleado />
                  </RutaProtegida>
                }
              />
              <Route
                path="/citasEmpleado"
                element={
                  <RutaProtegida rol="empleado">
                    <CitasEmpleado />
                  </RutaProtegida>
                }
              />
              <Route
                path="/admin"
                element={
                  <RutaProtegida rol="administrador">
                    <Admin />
                  </RutaProtegida>
                }
              />
              <Route
                path="/admin/productos"
                element={
                  <RutaProtegida rol="administrador">
                    <AdminProductos />
                  </RutaProtegida>
                }
              />
              <Route
                path="/actualizarProducto/:id"
                element={
                  <RutaProtegida rol="administrador">
                    <ActualizarProducto />
                  </RutaProtegida>
                }
              />
            </Routes>
          </m.div>
        </AnimatePresence>
      </LazyMotion>
    </MotionConfig>
  );
}

export default App;