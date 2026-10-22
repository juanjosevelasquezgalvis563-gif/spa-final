import {Router} from "express";
import { registro } from "../controllers/RegistroController.js";
import {actualizarDatos} from "../controllers/RegistroController.js";
import {login, me,loginGoogle} from "../controllers/LoginController.js";

import {middleware} from "../middlewares/middleware.js";



import {empleado} from "../controllers/EmpleadoController.js";
import { middlewareEmpleado } from "../middlewares/middlewareEmpleado.js";
import { comfirmarCita } from "../controllers/EmpleadoController.js";
import { finalizarCita } from "../controllers/EmpleadoController.js";
import { cancelarCita } from "../controllers/EmpleadoController.js";
import { citasHoy } from "../controllers/EmpleadoController.js";
import {citasPendientesEmpleado} from "../controllers/EmpleadoController.js";
import {citasFinalizadasEmpleado} from "../controllers/EmpleadoController.js";
import {citaRealizarEmpleado} from "../controllers/EmpleadoController.js";

import { cliente} from "../controllers/ClienteController.js"
import {servicios} from "../controllers/ClienteController.js"
import { obtenerCliente} from "../controllers/ClienteController.js";
import {cancelarSuCita} from "../controllers/ClienteController.js";
import { actualizarCita } from "../controllers/ClienteController.js";
import { cantidadDeCitas } from "../controllers/ClienteController.js";
import {citasPendientes} from "../controllers/ClienteController.js"
import { citasConfirmadas } from "../controllers/ClienteController.js";
import {citasFinalizadas} from "../controllers/ClienteController.js";
import { CitaRealizar } from "../controllers/ClienteController.js";
import { ultimasCitas } from "../controllers/ClienteController.js";
import { middlewareCliente } from "../middlewares/middlewareCliente.js";
import { crearResena } from "../controllers/ReseñaController.js";
import { obtenerResenas } from "../controllers/ReseñaController.js";
import { obtenerFidelizacion } from "../controllers/FidelizacionController.js";
import { obtenerCitasParaResena } from "../controllers/ClienteController.js";

import {admin} from "../controllers/AdminController.js";
import {middlewareAdmin} from "../middlewares/middlewareAdmin.js";
import { productosAdmin } from "../controllers/AdminController.js";
import {productosUpdate} from "../controllers/AdminController.js";
import { productosDelete } from "../controllers/AdminController.js";
import { comprasAdmin } from "../controllers/AdminController.js";
import { historialCompras } from "../controllers/AdminController.js";



import { forgotPassword } from "../controllers/RecuperaPassword.js";
import { resetPassword } from "../controllers/RecuperaPassword.js";
import {
    forgotPasswordIpLimiter,
    forgotPasswordEmailLimiter
} from "../middlewares/rateLimiter.js";
import rateLimit from "express-rate-limit";




const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    message:{
        message: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos."
    }
})



router.post('/registrar', registro);
router.put('/registrarr',middleware,actualizarDatos);


router.post('/login',loginLimiter, login);
router.post('/auth/google', loginGoogle);
router.get('/me', middleware, me);
router.post("/logout", (req, res) => {
    res.clearCookie("token");

    res.json({
        message: "sesión cerrada"
    });
});


router.get('/cliente/servicios',middlewareCliente,servicios);
router.post('/cliente',middlewareCliente,cliente);
router.get('/cliente',middlewareCliente, obtenerCliente);
router.put('/cliente/cancelar/:id',middlewareCliente,cancelarSuCita);
router.put('/cliente/actualizar/:id',middlewareCliente,actualizarCita);
router.get('/cliente/cantidadCitas',middlewareCliente,cantidadDeCitas);
router.get('/cliente/citasPendientes',middlewareCliente,citasPendientes);
router.get('/cliente/citasComfirmadas',middlewareCliente,citasConfirmadas);
router.get('/cliente/citasFinalizadas',middlewareCliente,citasFinalizadas);
router.get('/cliente/citaRealizar',middlewareCliente,CitaRealizar);
router.get('/cliente/ultimasCitas',middlewareCliente,ultimasCitas);
router.post("/cliente/resenas", middlewareCliente, crearResena);
router.get("/cliente/resenas",middlewareCliente, obtenerResenas);
router.get("/cliente/fidelizacion", middlewareCliente, obtenerFidelizacion);
router.get("/cliente/citasParaResena",middlewareCliente,obtenerCitasParaResena);

router.get('/empleado',middlewareEmpleado,empleado);
router.put('/empleado/comfirmar/:id',middlewareEmpleado,comfirmarCita);
router.put('/empleado/finalizar/:id',middlewareEmpleado,finalizarCita);
router.put('/empleado/cancelar/:id',middlewareEmpleado,cancelarCita);
router.get('/empleado/citasHoy',middlewareEmpleado,citasHoy);
router.get('/empleado/citasPendientesEmpleado',middlewareEmpleado,citasPendientesEmpleado);
router.get('/empleado/citasFinalizadasEmpleado',middlewareEmpleado,citasFinalizadasEmpleado);
router.get('/empleado/citaRealizarEmpleado',middlewareEmpleado,citaRealizarEmpleado);

router.get('/administrador',middlewareAdmin,admin);
router.get('/administrador/productos',middlewareAdmin,productosAdmin);
router.put('/administrador/productos/:id',middlewareAdmin,productosUpdate);
router.delete('/administrador/productos/:id',middlewareAdmin,productosDelete);
router.post('/administrador/compras',middlewareAdmin,comprasAdmin);
router.get('/administrador/historialCompras',middlewareAdmin,historialCompras);






router.post(
    '/forgot-password',
    forgotPasswordEmailLimiter,
    forgotPasswordIpLimiter,
    forgotPassword
);
router.post('/reset-password', resetPassword);




export default router;