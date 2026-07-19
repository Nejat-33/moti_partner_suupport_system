import { Router } from "express";
import { 
  getCaseSummaryMetrics, 
  getCaseDeepDetailProfile 
} from "./cases.controller";

const router = Router();

router.get("/cases/summary-counts", getCaseSummaryMetrics);
router.get("/cases/:caseId/deep-detail", getCaseDeepDetailProfile);

export const CaseAnalyticsRouter = router;