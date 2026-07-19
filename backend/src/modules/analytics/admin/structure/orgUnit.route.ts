import { Router } from "express";
import {
  getDivisionAnalytics,
  getDepartmentAnalytics,
  getSectionAnalytics,
  getServiceTypesList
} from "./orgUnit.controller";

const router = Router();

router.get("/structures/divisions", getDivisionAnalytics);
router.get("/structures/departments", getDepartmentAnalytics);
router.get("/structures/sections", getSectionAnalytics);

router.get("/structures/service-types", getServiceTypesList);

export const StructureRouter = router;