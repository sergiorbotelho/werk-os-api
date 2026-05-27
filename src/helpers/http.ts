import { Response } from "express";

export const badRequest = (res: Response, message: string) => {
  return res.status(400).json({
    message: message,
  });
};

export const serverError = (res: Response) => {
  return res.status(500).json({
    message: "Internal server error",
  });
};

export const ok = (res: Response, message: any) => {
  return res.status(200).json({
    message,
  });
};

export const notFound = (res: Response, message: string) => ({
  statusCode: 404,
  message,
});
