"use client";

import {useLogin} from "@/app/hooks/useLogin";

export default function LoginForm() {
  const {email, setEmail, password, setPassword, error, loading, login} =
    useLogin();

  return (
    <form
      method="post"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void login();
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1 block">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded border p-2"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
