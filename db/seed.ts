import { db } from "./index";
import { users, chatTopics, messages } from "./schema";
import bcrypt from "bcryptjs";

const testUsers = [
  { id: "user-doctor1", username: "doctor1", password: "password123", name: "Dr. Smith" },
  { id: "user-patient1", username: "patient1", password: "password123", name: "John Doe" },
  { id: "user-nurse1", username: "nurse1", password: "password123", name: "Jane Wilson" },
];

const testTopics = [
  {
    id: "topic-1",
    name: "General Consultation",
    description: "General health consultation with Dr. Smith",
    user1Id: "user-doctor1",
    user2Id: "user-patient1",
  },
  {
    id: "topic-2",
    name: "Follow-up Checkup",
    description: "Follow-up appointment discussion",
    user1Id: "user-doctor1",
    user2Id: "user-nurse1",
  },
  {
    id: "topic-3",
    name: "Medication Review",
    description: "Review of current medications",
    user1Id: "user-nurse1",
    user2Id: "user-patient1",
  },
];

const testMessages = [
  { roomId: "topic-1", sender: "Dr. Smith", content: "Hello John, how are you feeling today?" },
  { roomId: "topic-1", sender: "John Doe", content: "Hi Doctor, I've been having headaches lately." },
  { roomId: "topic-1", sender: "Dr. Smith", content: "I see. How long have you been experiencing them?" },
  { roomId: "topic-2", sender: "Dr. Smith", content: "Jane, can you check on patient in room 302?" },
  { roomId: "topic-2", sender: "Jane Wilson", content: "Sure, I'll go there right away." },
  { roomId: "topic-3", sender: "Jane Wilson", content: "John, have you been taking your medication regularly?" },
  { roomId: "topic-3", sender: "John Doe", content: "Yes, twice a day as prescribed." },
];

async function seed() {
  console.log("Seeding test users...");

  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    try {
      db.insert(users)
        .values({
          id: user.id,
          username: user.username,
          password: hashedPassword,
          name: user.name,
          createdAt: new Date(),
        })
        .run();
      console.log(`Created user: ${user.username}`);
    } catch {
      console.log(`User ${user.username} already exists`);
    }
  }

  console.log("\nSeeding chat topics...");
  for (const topic of testTopics) {
    try {
      db.insert(chatTopics)
        .values({
          ...topic,
          createdAt: new Date(),
        })
        .run();
      console.log(`Created topic: ${topic.name}`);
    } catch {
      console.log(`Topic ${topic.name} already exists`);
    }
  }

  console.log("\nSeeding messages...");
  for (const msg of testMessages) {
    try {
      db.insert(messages)
        .values({
          id: crypto.randomUUID(),
          ...msg,
          timestamp: new Date(Date.now() - Math.random() * 3600000),
        })
        .run();
    } catch {
      // Skip if exists
    }
  }
  console.log(`Created ${testMessages.length} messages`);

  console.log("\n=== Test Users ===");
  console.log("┌─────────────┬───────────────┬─────────────┐");
  console.log("│ Username    │ Password      │ Name        │");
  console.log("├─────────────┼───────────────┼─────────────┤");
  testUsers.forEach((u) => {
    console.log(`│ ${u.username.padEnd(11)} │ ${u.password.padEnd(13)} │ ${u.name.padEnd(11)} │`);
  });
  console.log("└─────────────┴───────────────┴─────────────┘");

  console.log("\n=== Chat Topics (Room IDs) ===");
  console.log("┌────────────┬─────────────────────────┬───────────────────────┐");
  console.log("│ Room ID    │ Topic                   │ Participants          │");
  console.log("├────────────┼─────────────────────────┼───────────────────────┤");
  testTopics.forEach((t) => {
    const u1 = testUsers.find((u) => u.id === t.user1Id)?.name || "";
    const u2 = testUsers.find((u) => u.id === t.user2Id)?.name || "";
    console.log(`│ ${t.id.padEnd(10)} │ ${t.name.padEnd(23)} │ ${(u1 + " & " + u2).padEnd(21)} │`);
  });
  console.log("└────────────┴─────────────────────────┴───────────────────────┘");
}

seed();
