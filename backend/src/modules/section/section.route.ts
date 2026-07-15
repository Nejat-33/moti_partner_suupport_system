import { Router } from "express";
import * as SectionController from "./section.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);
router.use(
  requireRole("SYSTEM_ADMIN", "DEPARTMENT_MANAGER", "DIVISION_MANAGER"),
);

router.post("/create", SectionController.create);
router.put("/update/:id", SectionController.update);
router.patch("/:id/deactivate", SectionController.deactivate);
router.patch("/:id/reactivate", SectionController.reactivate);

router.get("/getAll", SectionController.getAll);
router.get("/get/:id", SectionController.getSingle);

export const SectionRouter = router;
