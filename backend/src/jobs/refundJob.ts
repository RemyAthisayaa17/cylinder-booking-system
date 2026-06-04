// src/jobs/refundJob.ts
import cron from "node-cron";
import { processPendingRefunds } from "../services/orderService";

export const startRefundJob = () => {
  // Runs every 1 minute.
  // refundEligibleAt in cancelOrder must be set to a matching delay
  // (1 min for testing, 48 h for production) — see cancelOrder in orderService.ts.
  cron.schedule("* * * * *", async () => {
    console.log("Checking pending refunds...");

    try {
      const result = await processPendingRefunds();

      if (result.processed > 0) {
        console.log(
          `Refund Job Complete: ${result.processed} refund(s) processed`
        );
      }
    } catch (error) {
      console.error("Refund Job Failed:", error);
    }
  });
};