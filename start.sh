#!/bin/bash

# Color codes for pretty terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}      🚀 Starting BatchBook Dev Environment 🚀      ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Function to clean up background processes on exit
cleanup() {
  echo -e "\n${YELLOW}🧹 Stopping all running processes...${NC}"
  
  # Terminate Next.js, emulator, and function watch compiler
  if [ -n "$NEXT_PID" ]; then
    echo "Stopping Next.js app (PID $NEXT_PID)..."
    kill $NEXT_PID 2>/dev/null || true
  fi
  
  if [ -n "$EMULATOR_PID" ]; then
    echo "Stopping Firebase Emulators (PID $EMULATOR_PID)..."
    kill $EMULATOR_PID 2>/dev/null || true
  fi
  
  if [ -n "$WATCH_PID" ]; then
    echo "Stopping Cloud Functions compiler (PID $WATCH_PID)..."
    kill $WATCH_PID 2>/dev/null || true
  fi

  # Fallback: kill any other jobs in this shell group
  jobs -p | xargs -r kill 2>/dev/null || true
  
  echo -e "${GREEN}✨ All processes stopped successfully!${NC}"
}

# Trap Ctrl+C (SIGINT) and SIGTERM to run cleanup
trap cleanup EXIT INT TERM

# 1. Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Root node_modules not found. Installing dependencies...${NC}"
  npm install
fi

if [ ! -d "functions/node_modules" ]; then
  echo -e "${YELLOW}📦 Functions node_modules not found. Installing dependencies...${NC}"
  npm --prefix functions install
fi

# 2. Build Cloud Functions once to generate initial lib files
echo -e "${BLUE}⚡ Building Cloud Functions (TypeScript)...${NC}"
npm --prefix functions run build

# 3. Start watching Cloud Functions for changes in the background
echo -e "${BLUE}👀 Watching Cloud Functions for changes...${NC}"
npm --prefix functions run build:watch > /dev/null 2>&1 &
WATCH_PID=$!

# 4. Start Firebase Emulators
echo -e "${BLUE}🔥 Starting Firebase Emulators...${NC}"
npx firebase emulators:start &
EMULATOR_PID=$!

# 5. Wait for Firestore Emulator to be online, then seed it
echo -e "${YELLOW}⏳ Waiting for Firestore Emulator to be ready...${NC}"
FIRESTORE_PORT=8080
for i in {1..30}; do
  if curl -s "http://localhost:${FIRESTORE_PORT}" > /dev/null; then
    echo -e "${GREEN}🌱 Firestore is online! Seeding database...${NC}"
    npx tsx seed.ts || echo -e "${RED}⚠️ Seeding failed, but starting app anyway...${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}⚠️ Firestore emulator did not start in time. Skipping seed...${NC}"
  fi
  sleep 1
done

# 6. Start Next.js development server
echo -e "${BLUE}💻 Starting Next.js App...${NC}"
npm run dev &
NEXT_PID=$!

# Keep script running and wait for background processes
wait
