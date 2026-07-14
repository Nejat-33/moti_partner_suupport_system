import { Router } from "express";
import * as service from "./serviceType.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/service-types", service.FetchAllServiceTypes);
router.get("/service-types/:id", service.FetchServiceTypeById);

router.post("/service-types/create", service.CreateServiceType);
router.put("/service-types/update/:id", service.UpdateServiceType);
router.patch("/service-types/:id/status", service.ToggleServiceTypeActive);

export const ServiceTypeRouter = router;
