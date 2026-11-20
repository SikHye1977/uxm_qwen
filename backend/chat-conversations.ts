import "server-only";

import {db} from "./db";
import {getCurrentUser} from "./current_user";

export const MAX_CONVERSATIONS = 10;

type Conversation = {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

export class ConversationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ConversationError";
  }
}

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ConversationError(401, "로그인이 필요합니다.");
  }

  return user;
}

export function assertConversationOrigin(request: Request) {
  const baseURL = process.env.BETTER_AUTH_URL;

  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL 환경변수가 없습니다.");
  }

  if (request.headers.get("origin") !== new URL(baseURL).origin) {
    throw new ConversationError(403, "허용되지 않은 요청입니다.");
  }
}

export async function listConversations(): Promise<Conversation[]> {
  const user = await requireUser();

  const result = await db.query<Conversation>(
    `
      SELECT id, title, created_at, updated_at
      FROM public.chat_conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC, id DESC
    `,
    [user.id],
  );

  return result.rows;
}

export async function createConversation(): Promise<Conversation> {
  const user = await requireUser();
  const client = await db.connect();

  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");

    const userResult = await client.query(
      `
        SELECT id
        FROM public."user"
        WHERE id = $1
        FOR UPDATE
      `,
      [user.id],
    );

    if (userResult.rowCount === 0) {
      throw new ConversationError(401, "다시 로그인해주세요.");
    }

    const countResult = await client.query<{count: number}>(
      `
        SELECT count(*)::integer AS count
        FROM public.chat_conversations
        WHERE user_id = $1
      `,
      [user.id],
    );

    if (countResult.rows[0].count >= MAX_CONVERSATIONS) {
      throw new ConversationError(
        409,
        "대화방은 최대 10개까지 보관할 수 있습니다. 기존 대화를 삭제해주세요.",
      );
    }

    const result = await client.query<Conversation>(
      `
        INSERT INTO public.chat_conversations (user_id)
        VALUES ($1)
        RETURNING id, title, created_at, updated_at
      `,
      [user.id],
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteConversation(conversationId: string) {
  const user = await requireUser();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(conversationId)) {
    throw new ConversationError(400, "대화방 ID 형식이 올바르지 않습니다.");
  }

  const result = await db.query(
    `
      DELETE FROM public.chat_conversations
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [conversationId, user.id],
  );

  if (result.rowCount === 0) {
    throw new ConversationError(404, "대화방을 찾을 수 없습니다.");
  }
}
