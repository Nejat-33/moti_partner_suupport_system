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
import { ServiceTypeRouter } from "../modules/service/serviceType.route";
import { ProductRouter } from "../modules/product_category/product.Category.route";
import { CaseReportRouter } from "../modules/cases/case.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/staff", StaffRoutes);
router.use("/customer", CustomerRoute);
router.use("/user", UserProfile);
router.use("/service", ServiceTypeRouter);
router.use("/product", ProductRouter);
router.use("/cases", CaseReportRouter);

const PrivateRoute = Router();

PrivateRoute.use("/pro/admin/approval", ApprovalRouter);
PrivateRoute.use("/pro/role", RoleRoute);
PrivateRoute.use("/pro/admin/department", DepartmentRoute);
PrivateRoute.use("/pro/admin/service", ServiceTypeRouter);
PrivateRoute.use("/pro/division", DivisionRoute);
PrivateRoute.use("/pro/section", SectionRouter);

router.use("/", PrivateRoute);

export const ApiRouter = router;
