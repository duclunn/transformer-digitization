#!/bin/bash
# start_tunnel.sh - Start Backend and Ngrok, then provide Vercel instructions

echo "1. Starting Backend API (FastAPI)..."
cd backend
source venv/bin/activate
./venv/bin/python3 -m uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

echo "2. Starting Ngrok on port 8000..."
# Start ngrok silently in the background
ngrok http 8000 --log=stdout > /dev/null &
NGROK_PID=$!

echo "⏳ Waiting for Ngrok to generate a public URL..."
sleep 5 # Give Ngrok time to initialize

# Fetch the assigned public URL from Ngrok's local API resiliently using Python JSON parsing
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to retrieve Ngrok URL. Is Ngrok properly authenticated?"
    echo "Stopping processes..."
    kill $BACKEND_PID $NGROK_PID
    exit 1
fi

echo -e "\n============================================="
echo "✅ SUCCESS! Your Backend is public."
echo "Public API URL: $NGROK_URL"
echo -e "=============================================\n"

echo "🎯 HOW TO DEPLOY FRONTEND TO VERCEL 🎯"
echo "--------------------------------------------------------"
echo "Because your Ngrok URL is dynamic, you must tell Vercel"
echo "to use this specific URL during the build process."
echo ""
echo "Step 1 (If you haven't yet): Log into Vercel"
echo "  npm install -g vercel"
echo "  vercel login"
echo ""
echo "Step 2: Deploy your frontend!"
echo "Run the exact command below in a NEW terminal tab:"
echo ""
echo "  cd frontend && vercel deploy --build-env VITE_API_URL=$NGROK_URL"
echo ""
echo "--------------------------------------------------------"
echo "Backend and Ngrok are running in this terminal."
echo "Leave this window open. Press Ctrl+C to stop them."

# Wait for process exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID $NGROK_PID; exit" SIGINT SIGTERM
wait
