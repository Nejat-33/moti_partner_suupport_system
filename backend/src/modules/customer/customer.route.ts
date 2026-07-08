import { Router } from "express";
import {
  register,
  resendVerification,
  verifyEmail,
} from "./customer.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

export const CustomerRoute = router;
