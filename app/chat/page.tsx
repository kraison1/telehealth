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
  isUnread: boolean;
  lastMessageAt: Date | null;
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface OpenChat {
  topicId: string;
  topicName: string;
  otherUserName: string;
  minimized: boolean;
}

type FilterType = "all" | "unread" | "read";

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

// Small Chat Window Component
function ChatWindow({
  chat,
  socket,
  username,
  onClose,
  onMinimize,
}: {
  chat: OpenChat;
  socket: Socket | null;
  username: string;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-room", chat.topicId, username);
    socket.emit("get-history", chat.topicId);

    // Mark as read
    fetch("/api/topics/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: chat.topicId }),
    });

    const handleMessage = (message: Message) => {
      if (message.roomId === chat.topicId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    const handleHistory = (data: { messages: Message[]; hasMore: boolean }) => {
      setMessages(data.messages);
      setHasMoreMessages(data.hasMore);
      setLoadingMessages(false);
    };

    const handleMoreMessages = (data: { messages: Message[]; hasMore: boolean }) => {
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMoreMessages(data.hasMore);
      setLoadingMessages(false);
    };

    const handleTyping = (user: string) => {
      setTypingUser(user);
    };

    const handleStopTyping = () => {
      setTypingUser(null);
    };

    socket.on("receive-message", handleMessage);
    socket.on("message-history", handleHistory);
    socket.on("more-messages", handleMoreMessages);
    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);

    return () => {
      socket.off("receive-message", handleMessage);
      socket.off("message-history", handleHistory);
      socket.off("more-messages", handleMoreMessages);
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
    };
  }, [socket, chat.topicId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit("send-message", {
        sender: username,
        content: newMessage,
        roomId: chat.topicId,
      });
      setNewMessage("");
      socket.emit("stop-typing", chat.topicId);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit("typing", chat.topicId, username);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", chat.topicId);
      }, 1000);
    }
  };

  const loadMoreMessages = () => {
    if (hasMoreMessages && !loadingMessages && socket && messages.length > 0) {
      setLoadingMessages(true);
      const oldestMessage = messages[0];
      socket.emit("load-more-messages", chat.topicId, oldestMessage.timestamp);
    }
  };

  if (chat.minimized) {
    return (
      <div
        onClick={onMinimize}
        className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-600 transition relative"
      >
        <span className="text-white font-bold text-lg">
          {chat.otherUserName.charAt(0).toUpperCase()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs hover:bg-gray-600"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 h-96 bg-white rounded-t-lg shadow-2xl flex flex-col border border-gray-300">
      {/* Header */}
      <div className="bg-white px-3 py-2 flex items-center border-b border-gray-200 rounded-t-lg">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-2">
          {chat.otherUserName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{chat.otherUserName}</h3>
          <p className="text-xs text-green-500">Active</p>
        </div>
        <button
          onClick={onMinimize}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition ml-1"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 bg-white">
        {hasMoreMessages && (
          <div className="text-center mb-2">
            <button
              onClick={loadMoreMessages}
              disabled={loadingMessages}
              className="text-blue-500 text-xs hover:underline disabled:opacity-50"
            >
              {loadingMessages ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        <div className="space-y-1">
          {messages.map((message, index) => {
            const isMe = message.sender === username;
            const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender !== message.sender;

            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%]">
                  <div
                    className={`px-3 py-1.5 text-sm ${
                      isMe
                        ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md"
                    }`}
                  >
                    {message.content}
                  </div>
                  {isLastInGroup && (
                    <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? "text-right" : ""}`}>
                      {formatThaiTime(message.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {typingUser && typingUser !== username && (
          <div className="flex items-center gap-1 mt-1">
            <div className="bg-gray-100 rounded-full px-3 py-1.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Aa"
            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-1.5 text-blue-500 hover:bg-gray-100 rounded-full transition disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChatRoom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const username = session?.user?.name || "";

  // Topic list state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination & Filter
  const [topicPage, setTopicPage] = useState(1);
  const [topicPagination, setTopicPagination] = useState<Pagination | null>(null);
  const [topicFilter, setTopicFilter] = useState<FilterType>("all");
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Open chat windows (bottom right)
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTopics(1, topicFilter, true);
      fetchUsers();
    }
  }, [status, topicFilter]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const s = connectSocket();
    setSocket(s);

    return () => {
      disconnectSocket();
    };
  }, [status]);

  const fetchTopics = async (page: number, filter: FilterType, reset = false) => {
    setLoadingTopics(true);
    const res = await fetch(`/api/topics?page=${page}&filter=${filter}`);
    if (res.ok) {
      const data = await res.json();
      if (reset) {
        setTopics(data.topics);
      } else {
        setTopics((prev) => [...prev, ...data.topics]);
      }
      setTopicPagination(data.pagination);
      setTopicPage(page);
    }
    setLoadingTopics(false);
  };

  const loadMoreTopics = () => {
    if (topicPagination?.hasMore && !loadingTopics) {
      fetchTopics(topicPage + 1, topicFilter, false);
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
      fetchTopics(1, topicFilter, true);
    }
  };

  const openChat = (topic: Topic) => {
    // Check if already open
    if (openChats.some((c) => c.topicId === topic.id)) {
      // Unminimize if minimized
      setOpenChats((prev) =>
        prev.map((c) => (c.topicId === topic.id ? { ...c, minimized: false } : c))
      );
      return;
    }

    // Max 3 chat windows
    const otherUserName = topic.user1Name === username ? topic.user2Name : topic.user1Name;
    const newChat: OpenChat = {
      topicId: topic.id,
      topicName: topic.name,
      otherUserName,
      minimized: false,
    };

    setOpenChats((prev) => {
      if (prev.length >= 3) {
        return [...prev.slice(1), newChat];
      }
      return [...prev, newChat];
    });

    // Update read status in topic list
    setTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, isUnread: false } : t))
    );
  };

  const closeChat = (topicId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.topicId !== topicId));
  };

  const toggleMinimize = (topicId: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.topicId === topicId ? { ...c, minimized: !c.minimized } : c))
    );
  };

  // Filter topics by search
  const filteredTopics = topics.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user2Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-500 text-sm">Welcome, {username}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Search & Create */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search topics or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "unread", "read"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setTopicFilter(f)}
              className={`px-4 py-1.5 rounded-full capitalize text-sm font-medium transition ${
                topicFilter === f
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Topic List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingTopics && topics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : filteredTopics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? "No results found" : "No chat rooms found"}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTopics.map((topic) => {
                const otherUserName = topic.user1Name === username ? topic.user2Name : topic.user1Name;
                return (
                  <div
                    key={topic.id}
                    onClick={() => openChat(topic)}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition ${
                      topic.isUnread ? "bg-blue-50" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {otherUserName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-gray-900 truncate ${topic.isUnread ? "font-bold" : ""}`}>
                          {topic.name}
                        </h3>
                        {topic.isUnread && (
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm truncate">
                        {topic.user1Name} & {topic.user2Name}
                      </p>
                    </div>

                    {/* Time */}
                    {topic.lastMessageAt && (
                      <p className="text-gray-400 text-xs flex-shrink-0">
                        {formatThaiTime(topic.lastMessageAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {topicPagination?.hasMore && (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={loadMoreTopics}
                disabled={loadingTopics}
                className="w-full py-2 text-blue-500 hover:text-blue-600 font-medium text-sm disabled:opacity-50"
              >
                {loadingTopics ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Chat Room</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Topic Name"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createTopic}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Windows - Bottom Right */}
      <div className="fixed bottom-0 right-4 flex items-end gap-2 z-40">
        {openChats.map((chat) => (
          <ChatWindow
            key={chat.topicId}
            chat={chat}
            socket={socket}
            username={username}
            onClose={() => closeChat(chat.topicId)}
            onMinimize={() => toggleMinimize(chat.topicId)}
          />
        ))}
      </div>
    </div>
  );
}
