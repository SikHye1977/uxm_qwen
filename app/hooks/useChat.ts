import {useState} from "react";

export function useChat() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const question = input.trim();
    if (!question) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: question}),
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "failed to request");
      }

      setAnswer(data.answer);
      setInput("");
    } catch (error) {
      setAnswer(
        error instanceof Error ? error.message : "get error while request",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    input,
    setInput,
    answer,
    loading,
    sendMessage,
  };
}
