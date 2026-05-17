#!/bin/bash

# Color codes for pretty terminal output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}        💻 Starting Next.js Frontend Only 💻        ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Start Next.js dev server
npm run dev
