import {askQwen} from "@/backend/ollama";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (typeof body?.message !== "string" || !body.message.trim()) {
    return Response.json({error: "질문을 입력해주세요."}, {status: 400});
  }

  try {
    const answer = await askQwen(body.message.trim());

    return Response.json({answer});
  } catch (error) {
    console.error("Qwen 요청 실패:", error);

    return Response.json(
      {error: "답변을 받지 못했습니다. 잠시 후 다시 시도해주세요."},
      {status: 502},
    );
  }
}
