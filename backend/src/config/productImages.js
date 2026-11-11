import { fileURLToPath } from "node:url";

export const PRODUCT_IMAGES_DIR = fileURLToPath(
    new URL("../../uploads/products/", import.meta.url)
);

