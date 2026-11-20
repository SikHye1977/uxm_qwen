"use client";

import {useChat} from "@/app/hooks/useChat";
import MarkdownAnswer from "./MarkdownAnswer";

export default function ChatPanel() {
  const {input, setInput, answer, loading, sendMessage} = useChat();

  return (
    <main className="mx-auto max-w-10xl p-6">
      <h1 className="mb-4 text-xl font-bold">Qwen Chat</h1>
      <div
        aria-busy={loading}
        className="mb-4 min-h-64 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
      >
        {loading ? (
          <p role="status">Qwen이 답변을 생성하고 있습니다...</p>
        ) : answer ? (
          <MarkdownAnswer content={answer} />
        ) : (
          <p className="text-zinc-500">답변이 여기에 표시됩니다.</p>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          type="text"
          aria-label="질문"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-w-0 flex-1 rounded border p-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "응답 대기 중" : "전송"}
        </button>
      </form>
    </main>
  );
}
