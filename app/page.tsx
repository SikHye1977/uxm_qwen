import Link from "next/link";

export default function Home() {
  return (
    <div>
      <main> this is main page</main>
      <Link href="/chat" className="inline-block rounded border px-4 py-2">
        go to chat page
      </Link>
    </div>
  );
}
