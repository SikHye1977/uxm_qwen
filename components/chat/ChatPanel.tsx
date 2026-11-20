"use client";

import {useEffect, useRef} from "react";

import {useChat} from "@/app/hooks/useChat";
import MarkdownAnswer from "./MarkdownAnswer";

export default function ChatPanel() {
  const chat = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedRoom = chat.conversations.find(
    (room) => room.id === chat.selectedId,
  );
  const lastMessage = chat.messages[chat.messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({block: "nearest"});
  }, [
    chat.selectedId,
    lastMessage?.id,
    lastMessage?.status,
    chat.pendingQuestion,
  ]);

  const inputDisabled =
    !chat.selectedId || chat.busy || !chat.synced || chat.hasPending;

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Qwen Chat</h1>

        <button
          type="button"
          onClick={() => void chat.refresh()}
          disabled={chat.busy}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          목록·기록 새로고침
        </button>
      </header>

      {chat.error && (
        <p
          role="alert"
          className="mb-4 rounded border border-red-400 p-3 text-red-600 dark:text-red-300"
        >
          {chat.error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <aside
          aria-label="대화 목록"
          className="rounded-xl border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">내 대화</h2>
            <span className="text-sm text-zinc-500">
              {chat.conversations.length} / {chat.limit}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void chat.createConversation()}
            disabled={
              chat.busy ||
              !chat.synced ||
              chat.conversations.length >= chat.limit
            }
            className="mb-4 w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {chat.action === "creating" ? "생성 중..." : "+ 새 대화"}
          </button>

          {chat.conversations.length >= chat.limit && (
            <p className="mb-3 text-sm text-zinc-500">
              새 대화를 만들려면 기존 대화를 삭제해주세요.
            </p>
          )}

          <ul className="max-h-64 space-y-2 overflow-y-auto md:max-h-[65vh]">
            {chat.conversations.map((room) => (
              <li key={room.id} className="flex items-center gap-1">
                <button
                  type="button"
                  title={room.title}
                  aria-pressed={room.id === chat.selectedId}
                  onClick={() => void chat.selectConversation(room.id)}
                  disabled={chat.busy}
                  className={
                    "min-w-0 flex-1 truncate rounded px-3 py-2 text-left text-sm disabled:opacity-50 " +
                    (room.id === chat.selectedId
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800")
                  }
                >
                  {room.title}
                </button>

                <button
                  type="button"
                  aria-label={room.title + " 대화 삭제"}
                  onClick={() => void chat.deleteConversation(room.id)}
                  disabled={chat.busy || !chat.synced}
                  className="shrink-0 rounded px-2 py-2 text-sm text-red-600 disabled:opacity-50 dark:text-red-300"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          {!chat.busy && chat.conversations.length === 0 && (
            <p className="text-sm text-zinc-500">저장된 대화가 없습니다.</p>
          )}
        </aside>

        <section className="min-w-0" aria-label="선택한 대화">
          <h2 className="mb-3 truncate font-semibold">
            {selectedRoom?.title ?? "대화를 선택해주세요"}
          </h2>

          <div
            role="log"
            aria-label="대화 내용"
            aria-busy={chat.busy || chat.hasPending}
            className="h-[55vh] min-h-80 space-y-4 overflow-y-auto rounded-xl border border-zinc-300 p-4 dark:border-zinc-700"
          >
            {chat.messages.map((message) => (
              <article
                key={message.id}
                className={
                  "min-w-0 rounded-lg p-4 " +
                  (message.role === "user"
                    ? "bg-blue-50 dark:bg-blue-950"
                    : "bg-zinc-100 dark:bg-zinc-900")
                }
              >
                <p className="mb-2 text-sm font-semibold">
                  {message.role === "user" ? "나" : "Qwen"}
                </p>

                {message.status === "pending" ? (
                  <p>답변을 기다리고 있습니다...</p>
                ) : message.status === "failed" ? (
                  <p className="text-red-600 dark:text-red-300">
                    답변을 받지 못했습니다. 아래 입력창에서 다시 질문해주세요.
                  </p>
                ) : message.role === "assistant" ? (
                  <MarkdownAnswer content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )}
              </article>
            ))}

            {chat.pendingQuestion && (
              <article className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="mb-2 text-sm font-semibold">나</p>
                <p className="whitespace-pre-wrap break-words">
                  {chat.pendingQuestion}
                </p>
              </article>
            )}

            {chat.busy && (
              <p role="status" className="text-sm text-zinc-500">
                {chat.action === "sending"
                  ? "답변을 기다리고 있습니다..."
                  : "불러오는 중..."}
              </p>
            )}

            {!chat.busy && chat.messages.length === 0 && (
              <p className="text-zinc-500">
                {chat.selectedId
                  ? "첫 질문을 입력해주세요."
                  : "새 대화를 만들거나 왼쪽에서 대화를 선택해주세요."}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void chat.sendMessage();
            }}
          >
            <label
              htmlFor="chat-input"
              className="mb-2 block text-sm font-medium"
            >
              질문
            </label>

            <textarea
              id="chat-input"
              rows={3}
              value={chat.input}
              onChange={(event) => chat.setInput(event.target.value)}
              maxLength={4000}
              disabled={inputDisabled}
              placeholder="질문을 입력해주세요."
              className="w-full resize-y rounded-lg border border-zinc-300 p-3 disabled:opacity-50 dark:border-zinc-700"
            />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                {chat.input.length} / 4,000
              </span>

              <button
                type="submit"
                disabled={inputDisabled || !chat.input.trim()}
                className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {chat.action === "sending" || chat.hasPending
                  ? "응답 대기 중"
                  : "전송"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
