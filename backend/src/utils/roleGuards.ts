import { AppError } from "./AppError";

const ADMIN_PHONE = process.env.ADMIN_PHONE;

export const isAdminPhone = (phone: string) => {
  return phone === ADMIN_PHONE;
};


export const blockAdminPhone = (phone: string, action: string) => {
  if (phone === ADMIN_PHONE) {
    throw new AppError("Operation not allowed",403)
  }
};

export { ADMIN_PHONE };