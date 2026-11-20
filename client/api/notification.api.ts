import API from "./axios";

export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
}

export const notificationApi = {
  /**
   * Sends an email directly through the backend SMTP server — the browser
   * never opens a mail app. Throws with the server's message on failure.
   */
  sendEmail(payload: SendEmailPayload) {
    return API.post<{ success: boolean; message: string }>(
      "/notifications/send-email",
      payload
    );
  },
};
