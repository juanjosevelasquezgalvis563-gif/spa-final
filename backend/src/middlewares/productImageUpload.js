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
        callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
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
