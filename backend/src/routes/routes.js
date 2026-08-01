import {Router} from "express";
import { registro } from "../controllers/RegistroController.js";
import {actualizarDatos} from "../controllers/RegistroController.js";
import {login, me} from "../controllers/LoginController.js";

import {middleware} from "../middlewares/middleware.js";


import {empleado} from "../controllers/EmpleadoController.js";
import { middlewareEmpleado } from "../middlewares/middlewareEmpleado.js";
import { comfirmarCita } from "../controllers/EmpleadoController.js";
import { finalizarCita } from "../controllers/EmpleadoController.js";
import { cancelarCita } from "../controllers/EmpleadoController.js";

import { cliente} from "../controllers/ClienteController.js"
import { obtenerCliente} from "../controllers/ClienteController.js";
import {cancelarSuCita} from "../controllers/ClienteController.js";
import { actualizarCita } from "../controllers/ClienteController.js";
import { cantidadDeCitas } from "../controllers/ClienteController.js";
import {citasPendientes} from "../controllers/ClienteController.js"
import { citasComfirmadas } from "../controllers/ClienteController.js";
import {citasFinalizadas} from "../controllers/ClienteController.js";
import { CitaRealizar } from "../controllers/ClienteController.js";
import { middlewareCliente } from "../middlewares/middlewareCliente.js";





const router = Router();

router.post('/registrar', registro);
router.put('/registrarr',middleware,actualizarDatos);

router.post('/login', login);
router.get('/me', middleware, me);


router.post('/cliente',middlewareCliente,cliente);
router.get('/cliente',middlewareCliente, obtenerCliente);
router.put('/cliente/cancelar/:id',middlewareCliente,cancelarSuCita);
router.put('/cliente/actualizar/:id',middlewareCliente,actualizarCita);
router.get('/cliente/cantidadCitas',middlewareCliente,cantidadDeCitas);
router.get('/cliente/citasPendientes',middlewareCliente,citasPendientes);
router.get('/cliente/citasComfirmadas',middlewareCliente,citasComfirmadas);
router.get('/cliente/citasFinalizadas',middlewareCliente,citasFinalizadas);
router.get('/cliente/citaRealizar',middlewareCliente,CitaRealizar);

router.get('/empleado',middlewareEmpleado,empleado);
router.put('/empleado/comfirmar/:id',middlewareEmpleado,comfirmarCita);
router.put('/empleado/finalizar/:id',middlewareEmpleado,finalizarCita);
router.put('/empleado/cancelar/:id',middlewareEmpleado,cancelarCita);




export default router;