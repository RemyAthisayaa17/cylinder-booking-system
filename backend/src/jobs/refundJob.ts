
import cron from "node-cron";
import { processPendingRefunds } from "../services/orderService";

export const startRefundJob = () => {

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