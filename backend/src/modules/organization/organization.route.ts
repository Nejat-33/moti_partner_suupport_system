import express from "express";
import { getAll } from "./organization.controller";
const router = express.Router();

router.get("/getById", getAll);
router.get("/getAll", getAll);
router.get("/create", getAll);
router.get("/update", getAll);
router.get("/reactivate", getAll);
router.get("/deactivate", getAll);

export const OrganizationRouter = router;
