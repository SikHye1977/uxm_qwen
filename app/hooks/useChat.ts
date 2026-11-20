"use client";

import {useEffect, useRef, useState} from "react";

import {
  ChatApiError,
  chatRequest,
  errorMessage,
  type ChatMessage,
  type Conversation,
} from "@/lib/chat-api";

type Snapshot = {
  conversations: Conversation[];
  limit: number;
  selectedId: string | null;
  messages: ChatMessage[];
};

type Action = "loading" | "creating" | "deleting" | "sending";

async function loadSnapshot(
  preferredId: string | null,
  signal?: AbortSignal,
): Promise<Snapshot> {
  const data = await chatRequest<{
    conversations: Conversation[];
    limit: number;
  }>("/api/conversations", {signal});

  const selectedId = data.conversations.some((room) => room.id === preferredId)
    ? preferredId
    : (data.conversations[0]?.id ?? null);

  if (!selectedId) {
    return {...data, selectedId: null, messages: []};
  }

  try {
    const result = await chatRequest<{messages: ChatMessage[]}>(
      "/api/conversations/" + selectedId + "/messages",
      {signal},
    );

    return {...data, selectedId, messages: result.messages};
  } catch (error) {
    // 다른 탭에서 삭제된 대화방일 수 있습니다.
    if (error instanceof ChatApiError && error.status === 404) {
      return {
        conversations: data.conversations.filter(
          (room) => room.id !== selectedId,
        ),
        limit: data.limit,
        selectedId: null,
        messages: [],
      };
    }

    throw error;
  }
}

export function useChat() {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    conversations: [],
    limit: 10,
    selectedId: null,
    messages: [],
  });

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action | null>("loading");
  const [synced, setSynced] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");

  const alive = useRef(false);
  const locked = useRef(true);
  const epoch = useRef(0);

  const selectedId = snapshot.selectedId;
  const hasPending = snapshot.messages.some(
    (message) => message.status === "pending",
  );

  // 처음 화면을 열면 목록과 최근 대화를 불러옵니다.
  useEffect(() => {
    alive.current = true;
    let stopped = false;
    const controller = new AbortController();

    loadSnapshot(null, controller.signal)
      .then((data) => {
        if (!stopped) {
          setSnapshot(data);
          setSynced(true);
        }
      })
      .catch((error: unknown) => {
        if (!stopped) setError(errorMessage(error));
      })
      .finally(() => {
        if (!stopped) {
          locked.current = false;
          setAction(null);
        }
      });

    return () => {
      stopped = true;
      alive.current = false;
      epoch.current += 1;
      controller.abort();
    };
  }, []);

  // 새로고침 후에도 진행 중인 답변을 계속 확인합니다.
  useEffect(() => {
    if (!selectedId || !hasPending || action !== null) return;

    const roomId = selectedId;
    const controller = new AbortController();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped || locked.current) return;

      const version = epoch.current;

      try {
        const data = await loadSnapshot(roomId, controller.signal);

        if (
          !stopped &&
          alive.current &&
          epoch.current === version &&
          !locked.current
        ) {
          setSnapshot(data);
          if (data.selectedId !== roomId) setInput("");
          setSynced(true);
          setError("");
        }
      } catch (error) {
        if (
          !stopped &&
          alive.current &&
          epoch.current === version &&
          !locked.current
        ) {
          setSynced(false);
          setError(errorMessage(error));
        }
      }

      if (!stopped) timer = setTimeout(poll, 3000);
    }

    timer = setTimeout(poll, 3000);

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [selectedId, hasPending, action]);

  // 작업이 끝나면 DB의 최신 목록과 메시지를 다시 읽습니다.
  async function perform(
    nextAction: Action,
    preferredId: string | null,
    work?: () => Promise<string | null>,
    question = "",
  ) {
    if (locked.current) return;

    locked.current = true;
    epoch.current += 1;
    setAction(nextAction);
    setSynced(false);
    setError("");
    setPendingQuestion(question);

    let targetId = preferredId;
    const errors: string[] = [];

    try {
      try {
        if (work) targetId = await work();
      } catch (error) {
        errors.push(errorMessage(error));
      }

      if (!alive.current) return;

      try {
        const data = await loadSnapshot(targetId);

        if (alive.current) {
          setSnapshot(data);
          if (data.selectedId !== preferredId) setInput("");
          setSynced(true);
        }
      } catch (error) {
        errors.push("기록을 다시 불러오지 못했습니다. " + errorMessage(error));
      }

      if (alive.current) setError(errors.join(" "));
    } finally {
      locked.current = false;

      if (alive.current) {
        setPendingQuestion("");
        setAction(null);
      }
    }
  }

  async function selectConversation(id: string) {
    await perform("loading", id, async () => {
      setInput("");
      return id;
    });
  }

  async function createConversation() {
    if (!synced || snapshot.conversations.length >= snapshot.limit) {
      return;
    }

    await perform("creating", selectedId, async () => {
      const data = await chatRequest<{conversation: Conversation}>(
        "/api/conversations",
        {method: "POST"},
      );

      if (alive.current) setInput("");
      return data.conversation.id;
    });
  }

  async function deleteConversation(id: string) {
    if (locked.current || !synced) return;

    if (!window.confirm("이 대화와 모든 메시지를 삭제할까요?")) {
      return;
    }

    await perform("deleting", selectedId, async () => {
      await chatRequest<{ok: boolean}>("/api/conversations/" + id, {
        method: "DELETE",
      });

      if (id === selectedId) {
        if (alive.current) setInput("");
        return null;
      }

      return selectedId;
    });
  }

  async function sendMessage() {
    const question = input.trim();

    if (!selectedId || !question || !synced || hasPending) return;

    const roomId = selectedId;

    await perform(
      "sending",
      roomId,
      async () => {
        await chatRequest<{message: ChatMessage}>(
          "/api/conversations/" + roomId + "/messages",
          {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message: question}),
          },
        );

        if (alive.current) setInput("");
        return roomId;
      },
      question,
    );
  }

  return {
    ...snapshot,
    input,
    setInput,
    error,
    action,
    synced,
    pendingQuestion,
    hasPending,
    busy: action !== null,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    refresh: () => perform("loading", selectedId),
  };
}
