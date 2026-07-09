import { Router } from "express";

const route = Router();

route.post("/create");
route.patch("/update");
route.get("/getAll");
route.get("/getSingle/:id");

export const ProductCategoryRoute = route;
