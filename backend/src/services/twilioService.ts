import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const SERVICE_ID = process.env.TWILIO_SERVICE_ID!;

export const sendTwilioOtp = async (phone: string) => {
  return client.verify.v2.services(SERVICE_ID).verifications.create({
    to: phone,
    channel: "sms"
  });
};

export const verifyTwilioOtp = async (phone: string, code: string) => {
  return client.verify.v2.services(SERVICE_ID).verificationChecks.create({
    to: phone,
    code
  });
};