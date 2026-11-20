import "server-only";

export type OllamaMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askQwen(
  input: string | OllamaMessage[],
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;

  if (!baseUrl || !model) {
    throw new Error("Ollama 환경변수가 없습니다.");
  }

  const messages: OllamaMessage[] =
    typeof input === "string" ? [{role: "user", content: input}] : input;

  const response = await fetch(new URL("/api/chat", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  if (
    typeof data?.message?.content !== "string" ||
    !data.message.content.trim()
  ) {
    throw new Error("Ollama에서 유효한 답변을 받지 못했습니다.");
  }

  return data.message.content;
}
