"use client";

import {useState} from "react";
import {useChat} from "../hooks/useChat";
import {send} from "process";

export default function Chat() {
  const {input, setInput, answer, sendMessage} = useChat();

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">Qwen Chat</h1>
      <div
        role="status"
        className="mb-4 min-h-64 whitespace-pre-wrap rounded border p-4"
      >
        {answer || "답변이 여기에 표시됩니다."}
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
          disabled={!input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </main>
  );
}
