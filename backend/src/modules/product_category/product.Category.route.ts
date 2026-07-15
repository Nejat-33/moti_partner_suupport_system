import { Router } from "express";
import * as category from "./productCategory.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/categories", category.fetchAllCategories);
router.get("/categories/:id", category.fetchCategoryById);
router.post(
  "/categories/create",
  requireRole("SYSTEM_ADMIN"),
  category.createCategory,
);
router.put(
  "/categories/:id",
  requireRole("SYSTEM_ADMIN"),
  category.updateCategory,
);
router.patch(
  "/categories/:id/status",
  requireRole("SYSTEM_ADMIN"),
  category.toggleCategoryActive,
);

router.get("/subcategories", category.fetchAllSubcategories);
router.get("/subcategories/:id", category.fetchSubcategoryById);
router.post(
  "/subcategories/create",
  requireRole("SYSTEM_ADMIN"),
  category.createSubcategory,
);
router.put(
  "/subcategories/:id",
  requireRole("SYSTEM_ADMIN"),
  category.updateSubcategory,
);
router.patch(
  "/subcategories/:id/status",
  requireRole("SYSTEM_ADMIN"),
  category.toggleSubcategoryActive,
);

export const ProductRouter = router;
