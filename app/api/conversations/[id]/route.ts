import {
  ConversationError,
  assertConversationOrigin,
  deleteConversation,
} from "@/backend/chat-conversations";

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

export async function DELETE(
  request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    assertConversationOrigin(request);

    const {id} = await params;

    await deleteConversation(id);

    return Response.json({ok: true}, {headers: responseHeaders});
  } catch (error) {
    if (error instanceof ConversationError) {
      return Response.json(
        {error: error.message},
        {status: error.status, headers: responseHeaders},
      );
    }

    console.error("대화방 삭제 오류:", error);

    return Response.json(
      {error: "대화방을 삭제하지 못했습니다."},
      {status: 500, headers: responseHeaders},
    );
  }
}
