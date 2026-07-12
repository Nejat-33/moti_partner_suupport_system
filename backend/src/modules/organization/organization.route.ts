/* import express from "express";
import { getAll } from "./organization.controller";
import { requireRole } from "../../middleware/rbac.middleware";

const router = express.Router();

router.use(requireRole("SYSTEM_ADMIN"))

router.get("/getById", getAll);
router.get("/getAll", getAll);
router.get("/create", getAll);
router.get("/update", getAll);
router.get("/reactivate", getAll);
router.get("/deactivate", getAll);

export const OrganizationRouter = router;
 
 */
