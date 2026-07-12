import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { AuthRoutes } from "../src/modules/auth/auth.route";
import { StaffRoutes } from "./modules/staff/staff.route";
import { CustomerRoute } from "./modules/customer/customer.route";
// import { OrganizationRouter } from "./modules/organization/organization.route";
// import { ProductCategoryRoute } from "./modules/product_category/product.Category.route";
import { ApprovalRouter } from "./modules/approval/approval.route";
import { RoleRoute } from "./modules/roleassignment/roleassignment.route";
import { DepartmentRoute } from "./modules/department/department.route";
import { SectionRouter } from "./modules/section/section.route";
import { DivisionRoute } from "./modules/division/devision.route";
import { ApiRouter } from "./route/route.index";

const app: Application = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", ApiRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(" Application Error Root:", err);

  res.status(err.status || 500).json({
    error:
      err.message ||
      "An unexpected operational failure occurred. Please try again.",
  });
});

export default app;
