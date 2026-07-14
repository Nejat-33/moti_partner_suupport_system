import { Router } from "express";
import { GetFilteredCases, CaseTracking } from "./caseReport.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticateToken);
router.get("/cases", GetFilteredCases);
router.get("/track/:caseNumber", CaseTracking);

export const CaseQueryRouter = router;
