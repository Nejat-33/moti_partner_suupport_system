import { Router } from "express";
import * as category from "./productCategory.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/categories", category.fetchAllCategories);
router.get("/categories/:id", category.fetchCategoryById);
router.post("/categories/create", category.createCategory);
router.put("/categories/:id", category.updateCategory);
router.patch("/categories/:id/status", category.toggleCategoryActive);

router.get("/subcategories", category.fetchAllSubcategories);
router.get("/subcategories/:id", category.fetchSubcategoryById);
router.post("/subcategories/create", category.createSubcategory);
router.put("/subcategories/:id", category.updateSubcategory);
router.patch("/subcategories/:id/status", category.toggleSubcategoryActive);

export const ProductRouter = router;
