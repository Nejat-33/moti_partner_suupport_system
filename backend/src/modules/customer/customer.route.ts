import { Router } from "express";
import {
  register,
  resendVerification,
  verifyEmail,
  handleGetCustomerHistory,
} from "./customer.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.get("/my-history", handleGetCustomerHistory);
router.get("/:customerId/history", handleGetCustomerHistory);

export const CustomerRoute = router;
