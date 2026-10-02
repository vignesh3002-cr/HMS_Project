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
    args?: any;
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
    // 90s, not the 60s this used to be. The backend's tool loop stops on a
    // wall-clock budget (LLM_ROUND_BUDGET_MS, default 45s in ai-llm.ts) and then
    // makes one extra tools-disabled call to summarise what it found, so the
    // server settles in the high-40s. At 60s the client was aborting just before
    // the server replied, and the orphaned loop kept burning free-tier quota
    // after the user had already seen an error. Keep this comfortably above
    // LLM_ROUND_BUDGET_MS plus that closing call.
    send: (data: AIChatMessage) =>
        API.post<AIChatResponse>("/ai-chat", data, { timeout: 90000 })
};
