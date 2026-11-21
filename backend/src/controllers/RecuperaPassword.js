
export async function forgotPassword(req, res) {
    let resetCreado = null;

    try {
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "Ingresa un correo electrónico válido"
            });
        }

        const { EMAIL_USER, EMAIL_PASSWORD, FRONTEND_URL } = process.env;

        if (!EMAIL_USER || !EMAIL_PASSWORD || !FRONTEND_URL) {
            console.error("Faltan variables de configuración de correo");

            return res.status(503).json({
                message: "El servicio de recuperación no está configurado"
            });
        }

        const usuario = await Usuario.findOne({
            attributes: ["id", "email"],
            where: { email }
        });

        if (!usuario) {
            return res.status(404).json({
                message: "No existe un usuario con ese correo"
            });
        }

        const token = crypto.randomBytes(32).toString("hex");

        const expiraEn = new Date(
            Date.now() + MINUTOS_EXPIRACION * 60 * 1000
        );

        resetCreado = await PasswordReset.create({
            usuario_id: usuario.id,
            token,
            expires_at: expiraEn
        });

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: EMAIL_USER.trim(),
                pass: EMAIL_PASSWORD.replace(/\s/g, "")
            }
        });

        const enlace =
            `${FRONTEND_URL.replace(/\/+$/, "")}/reset-password/${token}`;

        await transporter.sendMail({
            from: EMAIL_USER.trim(),
            to: usuario.email,
            subject: "Recuperación de contraseña",
            html: `
                <h2>Recuperar contraseña</h2>
                <p>Has solicitado recuperar la contraseña de tu cuenta.</p>
                <a href="${enlace}"
                   style="background:#000;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
                    Cambiar contraseña
                </a>
                <p>Este enlace es válido durante 15 minutos.</p>
            `
        });

        await PasswordReset.destroy({
            where: {
                usuario_id: usuario.id,
                token: { [Op.ne]: token }
            }
        });

        resetCreado = null;

        return res.status(200).json({
            message: "Se ha enviado el enlace de recuperación a tu correo"
        });

    } catch (error) {
        console.error("ERROR FORGOT PASSWORD:", error);

        if (resetCreado) {
            await resetCreado.destroy().catch(() => {});
        }

        return res.status(500).json({
            message: "Error al enviar el enlace de recuperación"
        });
    }
}
