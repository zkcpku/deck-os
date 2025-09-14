# Deck OS

A lightweight terminal-based desktop OS interface built with **Vite + Express**, featuring a web-based terminal emulator with complete xterm.js functionality.

## Architecture

This project uses a **dual-server architecture** for optimal performance:

- **Frontend**: Vite development server on port `3850`
- **Backend**: Express server with WebSocket support on port `3851`

### Key Features

- **Complete Terminal Emulation**: Full xterm.js support with node-pty backend
- **File System Browser**: Navigate and view files in the web interface
- **Web Proxy**: Browse any website through the embedded proxy
- **Lightweight Bundle**: Optimized from 673MB to 224MB (67% reduction)
- **Modern Stack**: React 19, TypeScript, Tailwind CSS, Zustand

## Getting Started

### Prerequisites

- Node.js 18+ with pnpm
- Python and build tools (for native module compilation)

### Installation

1. **Install dependencies**:
```bash
pnpm install
```

2. **Build native modules** (required for node-pty):
```bash
npx node-gyp rebuild
```

3. **Start development servers**:
```bash
pnpm run dev
```

This runs both frontend (Vite) and backend (Express) servers concurrently.

### Access the Application

Open [http://localhost:3850](http://localhost:3850) in your browser.

The application will automatically proxy backend requests to `http://localhost:3851`.

## Available Scripts

- `pnpm run dev` - Start both frontend and backend development servers
- `pnpm run build` - Build the frontend for production
- `pnpm run serve` - Start only the backend server
- `pnpm run lint` - Run ESLint code linting
- `pnpm run type-check` - Run TypeScript type checking

## Project Structure

```
├── app/                 # React components and frontend logic
├── components/          # Reusable UI components  
├── server/             # Express backend server
│   ├── index.js        # Main server entry
│   └── routes/         # API routes (proxy, files, WebSocket)
├── dev-server.js       # Custom concurrent development script
├── vite.config.ts      # Vite configuration with proxy setup
└── dist/               # Built frontend assets
```

## Development

### File Editing

Edit any file in the `app/` or `components/` directory. The Vite development server provides hot module replacement for instant updates.

### Backend Changes

The Express server automatically restarts when you modify files in the `server/` directory.

### Terminal Functionality

The terminal component uses:
- **xterm.js**: Frontend terminal emulator
- **node-pty**: Backend pseudo-terminal for real shell processes
- **WebSocket**: Real-time communication between frontend and backend

## Deployment

1. **Build the frontend**:
```bash
pnpm run build
```

2. **Start the production server**:
```bash
pnpm run serve
```

The Express server will serve both the API and static frontend files from the `dist/` directory.
