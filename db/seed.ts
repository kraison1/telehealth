import { db } from "./index";
import { users, chatTopics, messages } from "./schema";
import bcrypt from "bcryptjs";

const testUsers = [
  { id: "user-doctor1", username: "doctor1", password: "password123", name: "Dr. Smith", role: "doctor" },
  { id: "user-patient1", username: "patient1", password: "password123", name: "John Doe", role: "patient" },
  { id: "user-nurse1", username: "nurse1", password: "password123", name: "Jane Wilson", role: "nurse" },
];

// Generate 150+ topics for pagination testing
const generateTopics = () => {
  const topics = [
    { id: "topic-1", name: "General Consultation", description: "General health consultation", user1Id: "user-doctor1", user2Id: "user-patient1" },
    { id: "topic-2", name: "Follow-up Checkup", description: "Follow-up appointment", user1Id: "user-doctor1", user2Id: "user-nurse1" },
    { id: "topic-3", name: "Medication Review", description: "Review medications", user1Id: "user-nurse1", user2Id: "user-patient1" },
  ];

  // Add 150 more topics for pagination test
  for (let i = 4; i <= 155; i++) {
    const userPairs = [
      { user1Id: "user-doctor1", user2Id: "user-patient1" },
      { user1Id: "user-doctor1", user2Id: "user-nurse1" },
      { user1Id: "user-nurse1", user2Id: "user-patient1" },
    ];
    const pair = userPairs[i % 3];
    topics.push({
      id: `topic-${i}`,
      name: `Chat Topic #${i}`,
      description: `Test topic ${i} for pagination`,
      ...pair,
    });
  }
  return topics;
};

// Generate 150+ messages for a topic
const generateMessages = (roomId: string, count: number) => {
  const senders = ["Dr. Smith", "John Doe", "Jane Wilson"];
  const msgs = [];
  for (let i = 0; i < count; i++) {
    msgs.push({
      roomId,
      sender: senders[i % senders.length],
      content: `Message #${i + 1} - This is test message for pagination testing in room ${roomId}`,
    });
  }
  return msgs;
};

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
          role: user.role,
          createdAt: new Date(),
        })
        .run();
      console.log(`Created user: ${user.username}`);
    } catch {
      console.log(`User ${user.username} already exists`);
    }
  }

  const testTopics = generateTopics();
  console.log(`\nSeeding ${testTopics.length} chat topics...`);
  let topicCount = 0;
  for (const topic of testTopics) {
    try {
      db.insert(chatTopics)
        .values({
          ...topic,
          lastMessageAt: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in last 7 days
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 30), // Random time in last 30 days
        })
        .run();
      topicCount++;
    } catch {
      // Skip if exists
    }
  }
  console.log(`Created ${topicCount} topics`);

  // Generate 160 messages for topic-1 (for pagination testing)
  console.log("\nSeeding 160 messages in topic-1...");
  const topic1Messages = generateMessages("topic-1", 160);
  let msgCount = 0;
  for (let i = 0; i < topic1Messages.length; i++) {
    const msg = topic1Messages[i];
    try {
      db.insert(messages)
        .values({
          id: crypto.randomUUID(),
          ...msg,
          timestamp: new Date(Date.now() - (topic1Messages.length - i) * 60000), // 1 minute apart
        })
        .run();
      msgCount++;
    } catch {
      // Skip if exists
    }
  }
  console.log(`Created ${msgCount} messages in topic-1`);

  // Add some messages to other topics
  console.log("\nSeeding messages in other topics...");
  const otherMessages = [
    { roomId: "topic-2", sender: "Dr. Smith", content: "Jane, can you check on patient in room 302?" },
    { roomId: "topic-2", sender: "Jane Wilson", content: "Sure, I'll go there right away." },
    { roomId: "topic-3", sender: "Jane Wilson", content: "John, have you been taking your medication?" },
    { roomId: "topic-3", sender: "John Doe", content: "Yes, twice a day as prescribed." },
  ];
  for (const msg of otherMessages) {
    try {
      db.insert(messages)
        .values({
          id: crypto.randomUUID(),
          ...msg,
          timestamp: new Date(Date.now() - Math.random() * 3600000),
        })
        .run();
    } catch {
      // Skip
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SEED COMPLETE - PAGINATION TEST DATA");
  console.log("=".repeat(60));

  console.log("\n=== Test Users ===");
  console.log("┌─────────────┬───────────────┬─────────────┐");
  console.log("│ Username    │ Password      │ Name        │");
  console.log("├─────────────┼───────────────┼─────────────┤");
  testUsers.forEach((u) => {
    console.log(`│ ${u.username.padEnd(11)} │ ${u.password.padEnd(13)} │ ${u.name.padEnd(11)} │`);
  });
  console.log("└─────────────┴───────────────┴─────────────┘");

  console.log("\n=== Pagination Test Data ===");
  console.log(`Topics: ${testTopics.length} (more than 100 page size)`);
  console.log(`Messages in topic-1: 160 (more than 100 page size)`);
  console.log("\nTest pagination:");
  console.log("1. Login as doctor1, see 100 topics, click 'Load More'");
  console.log("2. Join topic-1, see 100 messages, click 'Load More Messages'");
}

seed();
