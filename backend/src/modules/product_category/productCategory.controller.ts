import { Request, Response } from "express";
import * as CatalogService from "./productCategory.service";
import { ForbiddenError, BadRequestError } from "../../utils/error";

const verifyAdminAccess = (req: Request): string => {
  const operator = (req as any).user;
  if (!operator || !operator.isSAdmin) {
    throw new ForbiddenError(
      "Access Denied: Only systemic administrators can configure catalog settings.",
    );
  }
  return operator.userId;
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const { name, brandName } = req.body;
    if (!name) throw new BadRequestError("Category name parameter missing.");

    const result = await CatalogService.createCategory({
      name,
      brandName,
      createdById: adminId,
    });
    res.status(201).json({
      message: "Product category created successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const id = req.params.id as string;
    const { name, brandName } = req.body;

    const result = await CatalogService.updateCategory(id, {
      name,
      brandName,
      updatedById: adminId,
    });
    res.status(200).json({
      message: "Product category updated successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const toggleCategoryActive = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean")
      throw new BadRequestError("isActive parameter must be a boolean flag.");

    const result = await CatalogService.setCategoryActiveStatus(
      id,
      isActive,
      adminId,
    );
    res.status(200).json({
      message: isActive
        ? "Category activated successfully."
        : "Category deactivated.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const fetchAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await CatalogService.getAllCategories();
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchCategoryById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await CatalogService.getCategoryById(id);
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const createSubcategory = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const { name, productCategoryId } = req.body;
    if (!name || !productCategoryId)
      throw new BadRequestError("Missing required payload parameters.");

    const result = await CatalogService.createSubcategory({
      name,
      productCategoryId,
      createdById: adminId,
    });
    res
      .status(201)
      .json({ message: "Subcategory registered successfully.", data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateSubcategory = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const id = req.params.id as string;
    const { name, productCategoryId } = req.body;

    const result = await CatalogService.updateSubcategory(id, {
      name,
      productCategoryId,
      updatedById: adminId,
    });
    res.status(200).json({
      message: "Subcategory context updated successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const toggleSubcategoryActive = async (req: Request, res: Response) => {
  try {
    const adminId = verifyAdminAccess(req);
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean")
      throw new BadRequestError("isActive parameter must be a boolean flag.");

    const result = await CatalogService.setSubcategoryActiveStatus(
      id,
      isActive,
      adminId,
    );
    res.status(200).json({
      message: `Subcategory active flag toggled to ${isActive}.`,
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const fetchAllSubcategories = async (req: Request, res: Response) => {
  try {
    const result = await CatalogService.getAllSubcategories();
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchSubcategoryById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await CatalogService.getSubcategoryById(id);
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
