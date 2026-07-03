import { Router } from "express";
import { login, logout } from "./auth.controller";
import { AccountLockoutGuard } from "../../middleware/rateLimiter";

const router = Router();

router.post("/login", AccountLockoutGuard, login);

router.post("/logout", logout);

export const AuthRoutes = router;
