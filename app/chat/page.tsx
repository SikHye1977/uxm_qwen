import LogoutButton from "@/components/auth/LogoutButton";
import ChatPanel from "@/components/chat/ChatPanel";
import {getCurrentUser} from "@/backend/current_user";

import {Suspense} from "react";
import {redirect} from "next/navigation";

export const instant = false;

export default function Chat() {
  return (
    <Suspense
      fallback={<p className="p-6">로그인 상태를 확인하고 있습니다...</p>}
    >
      <AuthenticatedChat />
    </Suspense>
  );
}

async function AuthenticatedChat() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <div className="flex justify-end px-6 pt-6">
        <LogoutButton />
      </div>

      <ChatPanel />
    </>
  );
}
