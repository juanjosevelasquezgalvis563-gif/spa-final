import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

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



import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";





function App() {
  return (
    <Routes>

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
        path="/actualizarProducto/:id"
        element={
          <RutaProtegida rol="administrador">
            <ActualizarProducto />
          </RutaProtegida>
        }
      />



    </Routes>
  );
}

export default App;