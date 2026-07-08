import { Router } from "express";
import { login, logout, me } from "./auth.controller";
import { AccountLockoutGuard } from "../../middleware/rateLimiter";
import { RequireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", AccountLockoutGuard, login);
router.post("/logout", logout);
router.get("/me", RequireAuth, me);

export const AuthRoutes = router;
