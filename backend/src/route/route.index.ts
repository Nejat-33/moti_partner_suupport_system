import { Router } from "express";
import { DepartmentRoute } from "../modules/department/department.route";
import { SectionRouter } from "../modules/section/section.route";
import { DivisionRoute } from "../modules/division/devision.route";
import { RoleRoute } from "../modules/roleassignment/roleassignment.route";
import { ApprovalRouter } from "../modules/approval/approval.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { StaffRoutes } from "../modules/staff/staff.route";
import { CustomerRoute } from "../modules/customer/customer.route";
import { UserProfile } from "../modules/users/users.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/staff", StaffRoutes);
router.use("/customer", CustomerRoute);
router.use("/user", UserProfile);
const PrivateRoute = Router();

PrivateRoute.use("/pro/admin/approval", ApprovalRouter);
PrivateRoute.use("/pro/admin/role", RoleRoute);
PrivateRoute.use("/pro/admin/department", DepartmentRoute);
PrivateRoute.use("/pro", DivisionRoute);
PrivateRoute.use("/pro", SectionRouter);

router.use("/", PrivateRoute);

export const ApiRouter = router;
