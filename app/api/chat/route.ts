import {getCurrentUser} from "@/backend/current_user";
import {askQwen} from "@/backend/ollama";

export async function POST(request: Request) {
  let user;

  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("로그인 상태 확인 실패:", error);

    return Response.json(
      {error: "로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요."},
      {status: 503},
    );
  }

  if (!user) {
    return Response.json({error: "로그인이 필요합니다."}, {status: 401});
  }

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
