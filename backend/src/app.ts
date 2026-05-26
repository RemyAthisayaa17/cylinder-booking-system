import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import deliveryRoutes from "./routes/deliveryRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";

import { errorMiddleware } from "./middleware/errorMiddleware";
import { notFoundMiddleware } from "./middleware/notFoundMiddleware";
import { apiLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";

const app = express();

// ------------------- CORE MIDDLEWARE -------------------
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// ------------------- REQUEST TRACING + RATE LIMITING -------------------
// Must be registered before routes so every request is logged and throttled.
app.use(requestLogger);
app.use(apiLimiter);

// ------------------- HEALTH CHECK -------------------
app.get("/ping", (req, res) => {
  res.status(200).json({
    code: 200,
    msg: "Server running successfully",
    data: null,
    error: null
  });
});

// ------------------- SWAGGER -------------------
try {
  const swaggerPath = path.join(__dirname, "docs", "swagger.yaml");
  const swaggerDocument = YAML.load(swaggerPath);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.warn("[SWAGGER] swagger.yaml not found — /api-docs disabled");
}

// ------------------- ROUTES -------------------
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ------------------- NOT FOUND -------------------
app.use(notFoundMiddleware);

// ------------------- GLOBAL ERROR HANDLER -------------------

app.use(errorMiddleware);

export default app;