#!/bin/bash
# start.sh — Start the Smart City demo
# Runs the Express API server and Vite dev server together
echo "Starting Smart City Services Platform..."
echo ""
echo "   API server  → http://localhost:3001"
echo "   Frontend    → http://localhost:5173"
echo ""
echo "   Press Ctrl+C to stop both."
echo ""

# Start API server in background
cd server && npm start &
SERVER_PID=$!

# Wait a moment for server to connect to MongoDB
sleep 2

# Start frontend dev server
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait for both
wait $SERVER_PID $FRONTEND_PID
