import express from "express";
import { getOrganizations } from "./organization.controller";

const router = express.Router();

router.get("/organizations", getOrganizations);

export default router;
