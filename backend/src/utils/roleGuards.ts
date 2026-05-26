const ADMIN_PHONE = "9123456780";

export const isAdminPhone = (phone: string) => {
  return phone === ADMIN_PHONE;
};

export const blockAdminPhone = (phone: string, action: string) => {
  if (phone === ADMIN_PHONE) {
    throw new Error(`Admin phone not allowed for ${action}`);
  }
};

export { ADMIN_PHONE };