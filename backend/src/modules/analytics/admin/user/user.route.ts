import { Router } from "express";
import {
  getActiveCustomersCount,
  getCustomerHistoryProfile,
  getStaffMetricsCount,
  getStaffDeepDirectory
} from "./user.controller";

const router = Router();

router.get("/customers/active-count", getActiveCustomersCount);
router.get("/customers/:customerId/history", getCustomerHistoryProfile);

router.get("/staff/metrics", getStaffMetricsCount);
router.get("/staff/directory-details", getStaffDeepDirectory);

export const AdminUserAnalyticsRouter = router;