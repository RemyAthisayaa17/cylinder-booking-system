import dotenv from "dotenv";
import app from "./app";
import { startRefundJob } from "./jobs/refundJob";

dotenv.config();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startRefundJob();
});