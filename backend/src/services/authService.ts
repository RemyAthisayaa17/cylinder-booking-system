import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { generateToken } from "../utils/jwt";
import { sendOtp, verifyOtp } from "./otpService";
import { blockAdminPhone, ADMIN_PHONE } from "../utils/roleGuards";

const ADMIN_NAME = "Administrator";
const ADMIN_ID = "admin-fixed-id";


export const registerCustomer = async (data: any) => {
  blockAdminPhone(data.phone, "customer registration");

  const existing = await prisma.customer.findUnique({
    where: { phone: data.phone }
  });

  if (existing) throw new AppError("Customer already exists", 409);
const existingPartner = await prisma.deliveryPartner.findUnique({
  where: { phone: data.phone }
});

if (existingPartner) {
  throw new AppError("Phone already registered", 409);
}
  const customer = await prisma.customer.create({ data });

  return {
    user: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone
    }
  };
};


export const sendOtpService = async (phone: string) => {
  blockAdminPhone(phone, "OTP request");
  return await sendOtp(phone);
};


export const verifyOtpService = async (phone: string, otp: string) => {
  blockAdminPhone(phone, "OTP verification");

  await verifyOtp(phone, otp);

  const customer = await prisma.customer.findUnique({ where: { phone } });

  if (!customer) throw new AppError("Customer not found", 404);

  const token = generateToken({
    id: customer.id,
    phone: customer.phone,
    role: "CUSTOMER"
  });

  return {
    message: "Login successful",
    token,
    role: "CUSTOMER",
    user: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone
    }
  };
};


export const partnerLoginService = async (phone: string) => {
  blockAdminPhone(phone, "partner login");

  const partner = await prisma.deliveryPartner.findUnique({
    where: { phone }
  });

  if (!partner) throw new AppError("Delivery partner not found", 404);

  const token = generateToken({
    id: partner.id,
    phone: partner.phone,
    role: "DELIVERY_PARTNER"
  });

  return {
    message: "Login successful",
    token,
    role: "DELIVERY_PARTNER",
    user: {
      id: partner.id,
      name: partner.name,
      phone: partner.phone
    }
  };
};


export const adminLoginService = async (phone: string) => {
  if (phone !== ADMIN_PHONE) {
    throw new AppError("Invalid admin credentials", 401);
  }

  const token = generateToken({
    id: ADMIN_ID,
    phone: ADMIN_PHONE,
    role: "ADMIN"
  });

  return {
    message: "Login successful",
    token,
    role: "ADMIN",
    user: {
      id: ADMIN_ID,
      name: ADMIN_NAME,
      phone: ADMIN_PHONE
    }
  };
};