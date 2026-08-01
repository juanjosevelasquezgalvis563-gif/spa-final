import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Registro from "./components/Registro";
import Login from "./components/Login";

import  Cliente from "./components/Cliente";
import Empleado from "./components/Empleado";
import Reprogramar from "./components/Reprogramar";
import Cita from "./components/Cita";
import MisCitas from "./components/MisCitas";
import ActualizarDatos from "./components/ActualizarDatos"





function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/perfil" element={<ActualizarDatos/>} />
      <Route path="/login" element={<Login />} />
      
      <Route path="/cliente" element={<Cliente />} />
      <Route path="/cita" element={<Cita />} />
      <Route path="/citas" element={<MisCitas />} />
      <Route path="/empleado" element={<Empleado />} />
      <Route path="/reprogramar/:id" element={<Reprogramar />} />

    
      
    </Routes>
  );
}

export default App;