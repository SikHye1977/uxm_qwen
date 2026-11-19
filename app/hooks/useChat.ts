import {useState} from "react";

export function useChat() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");

  function sendMessage() {
    const question = input.trim();
    if (!question) return;

    //
    setAnswer(`temporary answer`);
    setInput("");
  }

  return {
    input,
    setInput,
    answer,
    sendMessage,
  };
}
