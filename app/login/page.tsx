import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Qwen Chat 로그인</h1>

      <p className="mb-6 text-sm text-zinc-500">
        등록된 연구실 계정으로 로그인하세요.
      </p>

      <LoginForm />
    </main>
  );
}
