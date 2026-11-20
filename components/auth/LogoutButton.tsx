"use client";

import {useState} from "react";
import {authClient} from "@/lib/auth-client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError("로그아웃에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      window.location.replace("/login");
    } catch {
      setError("로그아웃 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className="rounded border px-3 py-2 disabled:opacity-50"
      >
        {loading ? "로그아웃 중..." : "로그아웃"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
