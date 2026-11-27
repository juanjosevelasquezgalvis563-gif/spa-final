import { fileURLToPath } from "node:url";
import path from "node:path";

const defaultProductImagesDir = fileURLToPath(
    new URL("../../uploads/products/", import.meta.url)
);

export const PRODUCT_IMAGES_DIR = process.env.PRODUCT_IMAGES_DIR
    ? path.resolve(process.env.PRODUCT_IMAGES_DIR)
    : defaultProductImagesDir;


    