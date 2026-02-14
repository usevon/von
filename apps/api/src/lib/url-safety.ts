import { BadRequestError, isSafeWebhookUrl } from "@usevon/utils";

export const assertSafeWebhookUrl = async (
  url: string,
  message: string
): Promise<void> => {
  if (!(await isSafeWebhookUrl(url))) {
    throw new BadRequestError(message);
  }
};
