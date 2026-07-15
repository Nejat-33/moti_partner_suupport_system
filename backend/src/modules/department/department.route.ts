import { Router } from "express";
import * as DeptController from "./department.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("SYSTEM_ADMIN"));

router.post("/create", DeptController.create);
router.patch("/update/:id", DeptController.update);
router.patch("/:id/deactivate", DeptController.deactivate);
router.patch("/:id/reactivate", DeptController.reactivate);

router.get("/getAll", DeptController.getAll);
router.get("/get/:id", DeptController.getSingle);

export const DepartmentRoute = router;
