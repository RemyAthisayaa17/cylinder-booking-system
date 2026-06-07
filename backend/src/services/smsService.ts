import axios from "axios";

export const sendArrivalSMS = async (
  phone: string,
  orderId: string
) => {

  // MOCK MODE
  if (process.env.SMS_MODE === "MOCK") {
    console.log(`
=================================
MOCK SMS NOTIFICATION
To: ${phone}

Partner Arrived

Your delivery partner has arrived.
Please be available to receive your cylinder.

Order ID: ${orderId}
=================================
`);

    return {
      success: true,
      mode: "MOCK_SMS",
    };
  }

  // REAL SMS MODE
  try {
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message: `Partner Arrived. Your delivery partner has arrived. Please be available to receive your cylinder. Order ID: ${orderId}`,
        language: "english",
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.SMS_API_KEY as string,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`SMS sent successfully to ${phone}`);

    return {
      success: true,
      mode: "FAST2SMS",
    };
  } catch (error: any) {
    console.log("FAST2SMS ERROR:");
    console.log(error.response?.data);
    console.log(error.message);

    console.log(`
=================================
MOCK SMS NOTIFICATION
To: ${phone}

Partner Arrived

Your delivery partner has arrived.
Please be available to receive your cylinder.

Order ID: ${orderId}
=================================
`);

    return {
      success: true,
      mode: "MOCK_SMS",
    };
  }
};