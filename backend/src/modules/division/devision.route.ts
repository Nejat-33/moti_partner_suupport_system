import { Router } from "express";
import * as DivisionController from "./division.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("SYSTEM_ADMIN", "DEPARTMENT_MANAGER"));

router.post("/create", DivisionController.create);
router.put("/update:id", DivisionController.update);
router.patch("/:id/deactivate", DivisionController.deactivate);
router.patch("/:id/reactivate", DivisionController.reactivate);
router.get("/getAll", DivisionController.getAll);
router.get("/get:id", DivisionController.getSingle);

export const DivisionRoute = router;
