import "server-only";

export async function askQwen(question: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;

  if (!baseUrl || !model) {
    throw new Error("There's no env setting!");
  }

  const response = await fetch(new URL("/api/chat", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{role: "user", content: question}],
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
