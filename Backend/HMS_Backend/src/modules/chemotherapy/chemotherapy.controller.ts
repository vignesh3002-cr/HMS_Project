import { Request, Response } from "express";
import * as chemotherapyService from "./chemotherapy.service";

export const getCancerTypes = async (req: Request, res: Response) => {
  try {
    const result = await chemotherapyService.getCancerTypes();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addCancerType = async (req: Request, res: Response) => {
  try {
    const result = await chemotherapyService.addCancerType(req.body);

    return res.status(201).json({
      success: true,
      message: "Cancer Type Added Successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};