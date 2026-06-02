
export const toDbPhone = (phone: string) => {
  return phone.replace(/\D/g, "");
};

export const toTwilioPhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }

 
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  if (cleaned.length > 10 && phone.trim().startsWith("+")) {
    return phone;
  }

  throw new Error(
    `Invalid phone number format for Twilio: ${phone}`
  );
};