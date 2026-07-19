import { Router } from "express";
import { 
  getCustomerCaseloadAnalytics, 
  getPSSupportPerformanceAnalytics 
} from "./user.controller";
import { authenticateToken } from "../../../middleware/auth.middleware";
import { requireRole } from "../../../middleware/rbac.middleware";


const router = Router();

router.use(authenticateToken);

router.get("/analytics/customers/caseload-performance", requireRole("CUSTOMER"), getCustomerCaseloadAnalytics);

router.get("/analytics/agent/performance-matrix", requireRole("SYSTEM_ADMIN", "DEPARTMENT_MANAGER", "SECTION_MANAGER", "DIVISION_MANAGER","PSSUPPORT"), getPSSupportPerformanceAnalytics);

export const UserAnalyticsRouter = router;