"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { formatThaiTime } from "@/lib/utils";
import { Avatar, ChatWindow, LoadingSpinner, Modal, Toast } from "@/components";
import type { Socket } from "socket.io-client";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  user1Name: string;
  user2Name: string;
  isUnread: boolean;
  lastMessageAt: Date | null;
  status: "open" | "closed";
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
  status: "open" | "closed";
}

type FilterType = "all" | "unread" | "read" | "closed";

export default function ChatRoom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const username = session?.user?.name || "";
  const userRole = session?.user?.role || "patient";

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
  const [topicFilter, setTopicFilter] = useState<FilterType>("unread");
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Open chat windows (bottom right)
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Create user modal (nurse only)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("patient");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTopics(1, topicFilter, searchQuery, true);
      fetchUsers();
    }
  }, [status, topicFilter, searchQuery]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const s = connectSocket();
    setSocket(s);

    return () => {
      disconnectSocket();
    };
  }, [status]);

  const fetchTopics = async (page: number, filter: FilterType, search: string, reset = false) => {
    setLoadingTopics(true);
    const params = new URLSearchParams({ page: String(page), filter });
    if (search) params.set("search", search);
    const res = await fetch(`/api/topics?${params}`);
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
      fetchTopics(topicPage + 1, topicFilter, searchQuery, false);
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

    const data = await res.json();
    if (res.ok) {
      setShowCreateModal(false);
      setNewTopicName("");
      setNewTopicDesc("");
      setSelectedUserId("");
      fetchTopics(1, topicFilter, searchQuery, true);
      setToast({ message: data.message || "Topic created successfully", type: "success" });
    } else {
      setToast({ message: data.error || "Failed to create topic", type: "error" });
    }
  };

  const createUser = async () => {
    if (!newUserName.trim() || !newUsername.trim() || !newUserPassword.trim()) return;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newUserName,
        username: newUsername,
        password: newUserPassword,
        role: newUserRole,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setShowCreateUserModal(false);
      setNewUserName("");
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRole("patient");
      fetchUsers();
      setToast({ message: data.message || "User created successfully", type: "success" });
    } else {
      setToast({ message: data.error || "Failed to create user", type: "error" });
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
      status: topic.status || "open",
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

  const handleStatusChange = (topicId: string, newStatus: "open" | "closed") => {
    setOpenChats((prev) =>
      prev.map((c) => (c.topicId === topicId ? { ...c, status: newStatus } : c))
    );
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, status: newStatus } : t))
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
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
          {userRole === "nurse" && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              New User
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "unread", "read", "closed"] as FilterType[]).map((f) => (
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Loading Overlay */}
          {loadingTopics && <LoadingSpinner overlay text="Loading..." />}

          {topics.length === 0 && !loadingTopics ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? "No results found" : "No chat rooms found"}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {topics.map((topic) => {
                const otherUserName = topic.user1Name === username ? topic.user2Name : topic.user1Name;
                return (
                  <div
                    key={topic.id}
                    onClick={() => openChat(topic)}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition ${
                      topic.isUnread ? "bg-blue-50" : ""
                    }`}
                  >
                    <Avatar name={otherUserName} size="lg" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-gray-900 truncate ${topic.isUnread ? "font-bold" : ""}`}>
                          {topic.name}
                        </h3>
                        {topic.isUnread && (
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm truncate">
                        {topic.user1Name} & {topic.user2Name}
                      </p>
                    </div>

                    {topic.lastMessageAt && (
                      <p className="text-gray-400 text-xs shrink-0">
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
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Chat Room"
      >
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
      </Modal>

      {/* Chat Windows - Bottom Right */}
      <div className="fixed bottom-0 right-4 flex items-end gap-2 z-40">
        {openChats.map((chat) => (
          <ChatWindow
            key={chat.topicId}
            chat={chat}
            socket={socket}
            username={username}
            userRole={userRole}
            onClose={() => closeChat(chat.topicId)}
            onMinimize={() => toggleMinimize(chat.topicId)}
            onStatusChange={handleStatusChange}
            onError={(msg) => setToast({ message: msg, type: "error" })}
            onSuccess={(msg) => setToast({ message: msg, type: "success" })}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Create User Modal (Nurse only) */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create New User"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={createUser}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-medium"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
