import { Response } from "express";

type ApiSuccessParams = {
  res: Response;
  code?: number;
  msg?: string;
  data?: any;
};

type ApiErrorParams = {
  res: Response;
  code?: number;
  msg?: string;
  error?: any;
};

export const successResponse = ({
  res,
  code = 200,
  msg = "Success",
  data = null
}: ApiSuccessParams) => {
  return res.status(code).json({
    code,
    msg,
    data,
    error: null
  });
};

export const errorResponse = ({
  res,
  code = 500,
  msg = "Error",
  error = null
}: ApiErrorParams) => {
  return res.status(code).json({
    code,
    msg,
    data: null,
    error
  });
};
