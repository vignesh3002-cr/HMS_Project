import API from "./axios";

export interface AIChatMessage {
    message: string;
    conversationId?: string;
    navRoutes?: Record<string, string>;
}

export interface AIPerformedAction {
    tool: string;
    description: string;
    success: boolean;
    result?: any;
    error?: string;
}

export interface AIChatResponse {
    success: boolean;
    message: string;
    conversationId: string;
    performedActions: AIPerformedAction[];
}

export const aiChatApi = {
    send: (data: AIChatMessage) =>
        API.post<AIChatResponse>("/ai-chat", data, { timeout: 60000 })
};
