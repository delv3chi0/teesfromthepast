import { Router } from "express";
import { getShopData, getProductBySlug } from "../controllers/storefrontProductController.js";

const router = Router();

router.get("/shop-data", getShopData);
router.get("/product/:slug", getProductBySlug);

export default router;
