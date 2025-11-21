"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  user1Name: string;
  user2Name: string;
}

interface User {
  id: string;
  name: string;
  username: string;
}

const formatThaiTime = (date: Date | string) => {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const formatted = d.toLocaleString("th-TH", options);
  return formatted + " น.";
};

export default function ChatRoom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState("");
  const username = session?.user?.name || "";
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Topic list state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTopics();
      fetchUsers();
    }
  }, [status]);

  const fetchTopics = async () => {
    const res = await fetch("/api/topics");
    if (res.ok) {
      const data = await res.json();
      setTopics(data);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setAllUsers(data);
    }
  };

  const createTopic = async () => {
    if (!newTopicName.trim() || !selectedUserId) return;

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTopicName,
        description: newTopicDesc || null,
        otherUserId: selectedUserId,
      }),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setNewTopicName("");
      setNewTopicDesc("");
      setSelectedUserId("");
      fetchTopics();
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    const s = connectSocket();
    setSocket(s);

    s.on("receive-message", (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    s.on("user-joined", ({ users }: { username: string; users: string[] }) => {
      setUsers(users);
    });

    s.on("user-left", ({ users }: { username: string; users: string[] }) => {
      setUsers(users);
    });

    s.on("user-typing", (username: string) => {
      setTypingUser(username);
    });

    s.on("user-stop-typing", () => {
      setTypingUser(null);
    });

    s.on("message-history", (history: Message[]) => {
      setMessages(history);
    });

    return () => {
      disconnectSocket();
    };
  }, [status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = (topicId?: string) => {
    const room = topicId || roomId;
    if (username.trim() && room.trim() && socket) {
      socket.emit("join-room", room, username);
      socket.emit("get-history", room);
      setRoomId(room);
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    setJoined(false);
    setMessages([]);
    setUsers([]);
    setRoomId("");
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit("send-message", {
        sender: username,
        content: newMessage,
        roomId,
      });
      setNewMessage("");
      socket.emit("stop-typing", roomId);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit("typing", roomId, username);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", roomId);
      }, 1000);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Chat Rooms</h1>
              <p className="text-gray-400">Welcome, {username}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>

          {/* Create New Room Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full mb-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            + Create New Chat Room
          </button>

          {/* Topic List */}
          <div className="space-y-4">
            {topics.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No chat rooms yet. Create one!</p>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-gray-800 p-4 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-white font-semibold">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-gray-400 text-sm">{topic.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {topic.user1Name} & {topic.user2Name}
                    </p>
                    <p className="text-gray-600 text-xs">Room ID: {topic.id}</p>
                  </div>
                  <button
                    onClick={() => joinRoom(topic.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Manual Room ID Input */}
          <div className="mt-8 bg-gray-800 p-4 rounded-xl">
            <h3 className="text-white font-semibold mb-3">Or join by Room ID</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => joinRoom()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">Create Chat Room</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Topic Name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user to chat with</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} (@{user.username})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTopic}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={leaveRoom}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Room: {roomId}</h1>
            <p className="text-gray-400 text-sm">
              {users.length} user{users.length !== 1 && "s"} online
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {users.map((user) => (
            <span
              key={user}
              className={`px-3 py-1 rounded-full text-sm ${
                user === username
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {user}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === username ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                message.sender === username
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              {message.sender !== username && (
                <p className="text-xs text-gray-400 mb-1">{message.sender}</p>
              )}
              <p>{message.content}</p>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {formatThaiTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        {typingUser && typingUser !== username && (
          <div className="text-gray-400 text-sm">{typingUser} is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
