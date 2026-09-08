import API from "./axios";

export interface NvidiaResponse {
  reasoning: string;
  content: string;
}

export const nvidiaApi = {
  chat: (prompt: string) =>
    API.post<{ success: boolean; data: NvidiaResponse }>("/nvidia/chat", {
      prompt,
    }),
};