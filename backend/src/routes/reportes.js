import { Router } from "express";
import {
    enviarReporteAhora,
    generarReporte,
    historialReportes,
    reporteMensual
} from "../controllers/ReportesController.js";

const router = Router();


router.get("/mensual", reporteMensual);
router.get("/historial", historialReportes);
router.post("/mensual/generar", generarReporte);
router.post("/mensual/enviar", enviarReporteAhora);

export default router;

