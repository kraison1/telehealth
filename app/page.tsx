import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Telehealth Chat</h1>
        <p className="text-gray-400 mb-8">Real-time 1-on-1 chat rooms</p>
        <Link
          href="/chat"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          Start Chatting
        </Link>
      </div>
    </div>
  );
}
