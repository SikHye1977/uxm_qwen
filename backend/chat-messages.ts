import "server-only";

import type {PoolClient} from "pg";

import {db} from "./db";
import {getCurrentUser} from "./current_user";
import {ConversationError} from "./chat-conversations";
import {askQwen, type OllamaMessage} from "./ollama";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "completed" | "failed";
  created_at: Date;
};

async function getUserId(conversationId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new ConversationError(401, "로그인이 필요합니다.");
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(conversationId)) {
    throw new ConversationError(400, "대화방 ID 형식이 올바르지 않습니다.");
  }

  return user.id;
}

async function inTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  let discardClient = false;

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardClient = true;
    }

    throw error;
  } finally {
    client.release(discardClient);
  }
}

async function lockConversation(
  client: PoolClient,
  conversationId: string,
  userId: string,
) {
  const result = await client.query(
    `
      SELECT id
      FROM public.chat_conversations
      WHERE id = $1 AND user_id = $2
      FOR UPDATE
    `,
    [conversationId, userId],
  );

  if (result.rows.length === 0) {
    throw new ConversationError(404, "대화방을 찾을 수 없습니다.");
  }
}

export async function listMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const userId = await getUserId(conversationId);

  const conversation = await db.query(
    `
      SELECT id
      FROM public.chat_conversations
      WHERE id = $1 AND user_id = $2
    `,
    [conversationId, userId],
  );

  if (conversation.rows.length === 0) {
    throw new ConversationError(404, "대화방을 찾을 수 없습니다.");
  }

  const result = await db.query<ChatMessage>(
    `
      SELECT
        m.id::text AS id,
        m.role,
        m.content,
        CASE
          WHEN m.status = 'pending'
            AND m.created_at <= now() - interval '5 minutes'
          THEN 'failed'
          ELSE m.status
        END AS status,
        m.created_at
      FROM public.chat_messages AS m
      JOIN public.chat_conversations AS c
        ON c.id = m.conversation_id
      WHERE c.id = $1 AND c.user_id = $2
      ORDER BY m.id
    `,
    [conversationId, userId],
  );

  return result.rows;
}

export async function sendMessage(
  conversationId: string,
  input: unknown,
): Promise<ChatMessage> {
  const userId = await getUserId(conversationId);

  if (typeof input !== "string" || !input.trim()) {
    throw new ConversationError(400, "질문을 입력해주세요.");
  }

  const question = input.trim();

  if (question.length > 4_000) {
    throw new ConversationError(400, "질문은 4,000자 이하로 입력해주세요.");
  }

  const prepared = await inTransaction(async (client) => {
    await lockConversation(client, conversationId, userId);

    await client.query(
      `
        UPDATE public.chat_messages
        SET status = 'failed'
        WHERE conversation_id = $1
          AND status = 'pending'
          AND created_at <= now() - interval '5 minutes'
      `,
      [conversationId],
    );

    const pending = await client.query(
      `
        SELECT id
        FROM public.chat_messages
        WHERE conversation_id = $1 AND status = 'pending'
        LIMIT 1
      `,
      [conversationId],
    );

    if (pending.rows.length > 0) {
      throw new ConversationError(
        409,
        "이 대화방의 답변을 생성 중입니다. 잠시 기다려주세요.",
      );
    }

    const previous = await client.query<OllamaMessage>(
      `
        SELECT role, content
        FROM public.chat_messages
        WHERE conversation_id = $1 AND status = 'completed'
        ORDER BY id DESC
        LIMIT 20
      `,
      [conversationId],
    );

    const isFirstMessage = previous.rows.length === 0;
    const history: OllamaMessage[] = previous.rows.reverse();

    if (history[0]?.role === "assistant") {
      history.shift();
    }

    await client.query(
      `
        INSERT INTO public.chat_messages
          (conversation_id, role, content, status)
        VALUES ($1, 'user', $2, 'completed')
      `,
      [conversationId, question],
    );

    const assistant = await client.query<{id: string}>(
      `
        INSERT INTO public.chat_messages
          (conversation_id, role, content, status)
        VALUES ($1, 'assistant', '', 'pending')
        RETURNING id::text AS id
      `,
      [conversationId],
    );

    const title = Array.from(question.replace(/\s+/g, " "))
      .slice(0, 50)
      .join("");

    await client.query(
      `
        UPDATE public.chat_conversations
        SET
          title = CASE WHEN $3 THEN $2 ELSE title END,
          updated_at = now()
        WHERE id = $1
      `,
      [conversationId, title, isFirstMessage],
    );

    history.push({role: "user", content: question});

    return {
      pendingId: assistant.rows[0].id,
      history,
    };
  });

  try {
    const answer = await askQwen(prepared.history);

    return await inTransaction(async (client) => {
      await lockConversation(client, conversationId, userId);

      const result = await client.query<ChatMessage>(
        `
          UPDATE public.chat_messages
          SET content = $3, status = 'completed'
          WHERE id = $1
            AND conversation_id = $2
            AND status = 'pending'
            AND created_at > now() - interval '5 minutes'
          RETURNING id::text AS id, role, content, status, created_at
        `,
        [prepared.pendingId, conversationId, answer],
      );

      if (result.rows.length === 0) {
        throw new ConversationError(
          409,
          "이 요청은 이미 종료되었습니다. 대화를 다시 확인해주세요.",
        );
      }

      await client.query(
        `
          UPDATE public.chat_conversations
          SET updated_at = now()
          WHERE id = $1 AND user_id = $2
        `,
        [conversationId, userId],
      );

      return result.rows[0];
    });
  } catch (error) {
    try {
      await db.query(
        `
          UPDATE public.chat_messages AS m
          SET status = 'failed'
          WHERE m.id = $1
            AND m.conversation_id = $2
            AND m.status = 'pending'
            AND EXISTS (
              SELECT 1
              FROM public.chat_conversations AS c
              WHERE c.id = m.conversation_id AND c.user_id = $3
            )
        `,
        [prepared.pendingId, conversationId, userId],
      );
    } catch (saveError) {
      console.error("메시지 실패 상태 저장 오류:", saveError);
    }

    if (error instanceof ConversationError) {
      throw error;
    }

    console.error("Qwen 답변 생성 또는 저장 오류:", error);

    throw new ConversationError(
      502,
      "답변을 생성하거나 저장하지 못했습니다. 다시 시도해주세요.",
    );
  }
}
