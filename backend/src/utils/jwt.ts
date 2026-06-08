import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN) as SignOptions["expiresIn"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}


export const generateToken = (payload: {
  id: string;
  phone: string;
  role: "CUSTOMER" | "DELIVERY_PARTNER" | "ADMIN";
}) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};