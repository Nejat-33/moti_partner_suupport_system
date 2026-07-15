import { Router } from "express";
import { getMyNotifications } from "./notification.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/get", getMyNotifications);

export const NotificationRouter = router;
