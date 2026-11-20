
import dotenv from "dotenv";
import "./src/models/associations.js";
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

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://spa-final-an59.vercel.app",
    "https://spa-final-an59-git-develop-velure-spa.vercel.app",
    frontendOrigin
].filter(Boolean);

app.use(
    helmet({
        crossOriginOpenerPolicy: {
            policy: "same-origin-allow-popups",
        },
    })
);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.error("Origen bloqueado por CORS:", origin);

            return callback(new Error("No permitido por CORS"));
        },
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(cookieParser());

app.use(express.json());

app.use(
    "/uploads/products",
    express.static(PRODUCT_IMAGES_DIR, {
        dotfiles: "deny",
        index: false,
        setHeaders: (res) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            res.setHeader(
                "Cache-Control",
                "public, max-age=31536000, immutable"
            );
        }
    })
);

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
        console.log(`Servidor backend activo en el puerto ${PORT}`);
    });

    iniciarRecordatorios();

    console.log("Recordatorios automáticos iniciados");

} catch (error) {
    console.error("Error al conectar con la base de datos:", error);
}
