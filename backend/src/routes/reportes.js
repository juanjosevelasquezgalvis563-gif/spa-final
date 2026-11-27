import { Router } from "express";
import {
    enviarReporteAhora,
    enviarReporteHistoricoAhora,
    generarReporte,
    historialReportes,
    reporteHistoricoPorId,
    reporteMensual
} from "../controllers/ReportesController.js";

const router = Router();


router.get("/mensual", reporteMensual);
router.get("/historial", historialReportes);
router.get("/historial/:id", reporteHistoricoPorId);
router.post("/historial/:id/enviar", enviarReporteHistoricoAhora);
router.post("/mensual/generar", generarReporte);
router.post("/mensual/enviar", enviarReporteAhora);

export default router;


