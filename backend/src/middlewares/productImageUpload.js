import multer from "multer";

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 3,
        parts: 4
    },
    fileFilter: (req, file, callback) => {
        const extension = file.originalname?.split(".").pop()?.toLowerCase();
        const mimePermitido = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"]
            .includes(file.mimetype?.toLowerCase());
        const extensionPermitida = ["jpg", "jpeg", "png", "webp"].includes(extension);

        callback(null, mimePermitido || extensionPermitida);
    }
});

export function cargarImagenProducto(req, res, next) {
    imageUpload.single("image")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
            return res.status(status).json({
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "La imagen debe pesar 5 MB o menos."
                    : "Solo se permite cargar una imagen por producto."
            });
        }

        if (error) return next(error);
        return next();
    });
}
