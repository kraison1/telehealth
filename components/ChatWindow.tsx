"use client";

import { useState, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import Avatar from "./Avatar";
import TypingIndicator from "./TypingIndicator";
import { formatThaiTime } from "@/lib/utils";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

interface OpenChat {
  topicId: string;
  topicName: string;
  otherUserName: string;
  minimized: boolean;
  status: "open" | "closed";
}

interface ChatWindowProps {
  chat: OpenChat;
  socket: Socket | null;
  username: string;
  userRole?: string;
  onClose: () => void;
  onMinimize: () => void;
  onStatusChange?: (topicId: string, status: "open" | "closed") => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export default function ChatWindow({
  chat,
  socket,
  username,
  userRole = "patient",
  onClose,
  onMinimize,
  onStatusChange,
  onError,
  onSuccess,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isClosed = chat.status === "closed";

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

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setTimeout(() => setError(null), 3000);
    };

    socket.on("receive-message", handleMessage);
    socket.on("message-history", handleHistory);
    socket.on("more-messages", handleMoreMessages);
    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);
    socket.on("message-error", handleError);

    return () => {
      socket.off("receive-message", handleMessage);
      socket.off("message-history", handleHistory);
      socket.off("more-messages", handleMoreMessages);
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
      socket.off("message-error", handleError);
    };
  }, [socket, chat.topicId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) {
      setError("This chat room is closed");
      setTimeout(() => setError(null), 3000);
      return;
    }
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
    if (socket && !isClosed) {
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

  const toggleStatus = async () => {
    const newStatus = isClosed ? "open" : "closed";
    const res = await fetch(`/api/topics/${chat.topicId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      onStatusChange?.(chat.topicId, newStatus);
      onSuccess?.(data.message || (newStatus === "closed" ? "Topic closed" : "Topic reopened"));
    } else {
      onError?.(data.error || "Failed to change status");
    }
    setShowMenu(false);
  };

  const canCloseTopic = userRole === "doctor" || userRole === "nurse";

  if (chat.minimized) {
    return (
      <div
        onClick={onMinimize}
        className={`w-14 h-14 ${isClosed ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"} rounded-full flex items-center justify-center cursor-pointer shadow-lg transition relative`}
      >
        <span className="text-white font-bold text-lg">
          {chat.otherUserName.charAt(0).toUpperCase()}
        </span>
        {isClosed && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
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
      <div className={`px-3 py-2 flex items-center border-b border-gray-200 rounded-t-lg ${isClosed ? "bg-gray-100" : "bg-white"}`}>
        <Avatar name={chat.otherUserName} size="sm" variant={isClosed ? "gray" : "blue"} />
        <div className="flex-1 ml-2">
          <h3 className="font-semibold text-gray-900 text-sm">{chat.otherUserName}</h3>
          <p className={`text-xs ${isClosed ? "text-red-500" : "text-green-500"}`}>
            {isClosed ? "Closed" : "Active"}
          </p>
        </div>

        {/* Menu button - only show for doctor/nurse */}
        {canCloseTopic && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-32">
                <button
                  onClick={toggleStatus}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  {isClosed ? (
                    <>
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                      Reopen Chat
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Close Chat
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-red-100 text-red-700 text-xs text-center">
          {error}
        </div>
      )}

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
              <TypingIndicator size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-gray-500 text-sm">This chat room is closed</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
