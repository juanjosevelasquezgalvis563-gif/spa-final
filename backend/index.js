import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./src/routes/routes.js";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
 res.json({ ok: true, message: "Backend funcionando correctamente" });
});
app.use("/inser", authRoutes);


app.listen(PORT, () => {
 console.log(`Servidor backend activo en http://localhost:${PORT}`);
});