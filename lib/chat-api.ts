"use client";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export class ChatApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

export async function chatRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    window.location.replace("/login");
    throw new ChatApiError(401, "다시 로그인해주세요.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "요청을 처리하지 못했습니다.";

    throw new ChatApiError(response.status, message);
  }

  if (data === null) {
    throw new Error("서버 응답을 읽지 못했습니다.");
  }

  return data as T;
}
