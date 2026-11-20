"use client";

import LogoutButton from "@/components/auth/LogoutButton";
import ChatPanel from "@/components/chat/ChatPanel";

export default function Chat() {
  return (
    <>
      <div className="flex justify-end px-6 pt-6">
        <LogoutButton />
      </div>
      <ChatPanel />
    </>
  );
}
