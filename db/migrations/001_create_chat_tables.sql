CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id text NOT NULL
    REFERENCES public."user"(id)
    ON DELETE CASCADE,

  title varchar(100) NOT NULL DEFAULT '새 대화'
    CHECK (length(btrim(title)) > 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  conversation_id uuid NOT NULL
    REFERENCES public.chat_conversations(id)
    ON DELETE CASCADE,

  role text NOT NULL
    CHECK (role IN ('user', 'assistant')),

  content text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed')),

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chat_messages_user_status_check
    CHECK (role <> 'user' OR status = 'completed'),

  CONSTRAINT chat_messages_completed_content_check
    CHECK (
      status <> 'completed'
      OR length(btrim(content)) > 0
    )
);

CREATE INDEX chat_conversations_user_updated_idx
  ON public.chat_conversations (
    user_id,
    updated_at DESC,
    id DESC
  );

CREATE INDEX chat_messages_conversation_order_idx
  ON public.chat_messages (
    conversation_id,
    id
  );
