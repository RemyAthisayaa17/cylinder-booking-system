export const normalizePhone = (phone: string): string => {
  // remove spaces
  let cleaned = phone.replace(/\s+/g, "");

  // already in international format
  if (cleaned.startsWith("+")) return cleaned;

  // India default (your case)
  return `+91${cleaned}`;
};