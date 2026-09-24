import dotenv from "dotenv";
import './src/models/associations.js';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/routes.js";
import db from "./src/config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

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

} catch (error) {
    console.error("Error al conectar con la base de datos:", error);
}