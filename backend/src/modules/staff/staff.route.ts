import { Router } from "express";
import { register, verifyEmail } from "./staff.controller";

const router = Router();

router.post("/register", register);
router.get("/verify-email", verifyEmail);

export const StaffRoutes = router;
