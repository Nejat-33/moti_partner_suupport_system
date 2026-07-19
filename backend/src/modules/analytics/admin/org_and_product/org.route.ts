import { Router } from "express";
import { 
  getOrganizationAnalytics, 
  getProductCatalogAnalytics 
} from "./org.controller";

const router = Router();

router.get("/organization/summary", getOrganizationAnalytics);

router.get("/products/categories-tree", getProductCatalogAnalytics);

export const OrganizationAndProductAnalyticsRouter = router;