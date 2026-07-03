import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { AuthRoutes } from "../src/modules/auth/auth.route";

const app: Application = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", AuthRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(" Application Error Root:", err);

  res.status(err.status || 500).json({
    error:
      err.message ||
      "An unexpected operational failure occurred. Please try again.",
  });
});

export default app;
