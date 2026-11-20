import {connection} from "next/server";

import {
  ConversationError,
  assertConversationOrigin,
} from "@/backend/chat-conversations";
import {listMessages, sendMessage} from "@/backend/chat-messages";

type Context = {
  params: Promise<{id: string}>;
};

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

  console.error("메시지 API 오류:", error);

  return Response.json(
    {error: "메시지 요청을 처리하지 못했습니다."},
    {status: 500, headers: responseHeaders},
  );
}

export async function GET(_request: Request, {params}: Context) {
  await connection();

  try {
    const {id} = await params;
    const messages = await listMessages(id);

    return Response.json({messages}, {headers: responseHeaders});
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, {params}: Context) {
  try {
    assertConversationOrigin(request);

    const {id} = await params;
    const body = await request.json().catch(() => null);
    const message = await sendMessage(id, body?.message);

    return Response.json({message}, {status: 201, headers: responseHeaders});
  } catch (error) {
    return handleError(error);
  }
}
