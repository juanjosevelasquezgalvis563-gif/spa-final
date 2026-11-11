import dotenv from "dotenv";
import './src/models/associations.js';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { PRODUCT_IMAGES_DIR } from "./src/config/productImages.js";
import authRoutes from "./src/routes/routes.js";
import db from "./src/config/db.js";
import { iniciarRecordatorios } from "./src/controllers/recordatorios.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const frontendOrigin = process.env.FRONTEND_URL?.replace(/\/+$/, "");

app.use(
  helmet({
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },
  })
);
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        frontendOrigin
    ].filter(Boolean),
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use("/uploads/products", express.static(PRODUCT_IMAGES_DIR, {
    dotfiles: "deny",
    index: false,
    setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
}));

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        message: "Backend funcionando correctamente"
    });
});

app.use("/inser", authRoutes);

try {
    await db.authenticate();
    console.log("Base de datos conectada con Sequelize");

    app.listen(PORT, () => {
        console.log(`Servidor backend activo en http://localhost:${PORT}`);
    });

     
    iniciarRecordatorios();

    console.log("Recordatorios automáticos iniciados");

} catch (error) {
    console.error("Error al conectar con la base de datos:", error);
}