import {connection} from "next/server";

import {
  MAX_CONVERSATIONS,
  ConversationError,
  assertConversationOrigin,
  createConversation,
  listConversations,
} from "@/backend/chat-conversations";

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

function handleError(error: unknown) {
  if (error instanceof ConversationError) {
    return Response.json(
      {error: error.message},
      {status: error.status, headers: responseHeaders},
    );
  }

  console.error("대화방 API 오류:", error);

  return Response.json(
    {error: "대화방 요청을 처리하지 못했습니다."},
    {status: 500, headers: responseHeaders},
  );
}

export async function GET() {
  await connection();

  try {
    const conversations = await listConversations();

    return Response.json(
      {
        conversations,
        count: conversations.length,
        limit: MAX_CONVERSATIONS,
      },
      {headers: responseHeaders},
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertConversationOrigin(request);

    const conversation = await createConversation();

    return Response.json(
      {conversation},
      {status: 201, headers: responseHeaders},
    );
  } catch (error) {
    return handleError(error);
  }
}
