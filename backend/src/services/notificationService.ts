import prisma from "../config/db";

export const createNotification = async (
  customerId: string,
  title: string,
  message: string
) => {
  return prisma.notification.create({
    data: {
      customerId,
      title,
      message,
    },
  });
};

export const createPartnerNotification = async (
  partnerId: string,
  title: string,
  message: string
) => {
  return prisma.notification.create({
    data: {
      partnerId,
      title,
      message,
    },
  });
};

export const getCustomerNotifications = async (
  customerId: string
) => {
  return prisma.notification.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getPartnerNotifications = async (
  partnerId: string
) => {
  return prisma.notification.findMany({
    where: {
      partnerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const markNotificationAsRead = async (
  notificationId: string
) => {
  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });
};