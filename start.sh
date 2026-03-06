#!/bin/bash
# Start script for the Transformer Digitization System

echo "Starting Backend API (FastAPI)..."
cd backend
source venv/bin/activate
./venv/bin/python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo "Starting Frontend Web App (React/Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n============================================="
echo "Both servers are starting!"
echo "Backend API is at: http://localhost:8000"
echo "Frontend UI is at: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo -e "=============================================\n"

# Wait for Ctrl+C to exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
