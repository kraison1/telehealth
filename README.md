# Telehealth Chat

Real-time 1-on-1 chat application built with Next.js, TypeScript, Tailwind CSS, and Socket.IO.

## Features

- Real-time messaging with WebSocket
- 1-on-1 chat rooms
- Typing indicators
- User join/leave notifications
- Thai timezone timestamps (Asia/Bangkok)

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Socket.IO

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

### 3. Open the app

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Click "Start Chatting" on the home page
2. Enter your name and a Room ID
3. Click "Join Room"
4. Share the same Room ID with another user to start chatting

## Project Structure

```
├── server.ts           # WebSocket server with Socket.IO
├── lib/socket.ts       # Client-side socket connection
├── app/
│   ├── page.tsx        # Landing page
│   └── chat/
│       └── page.tsx    # Chat room UI
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
