#!/bin/bash
# Double-click to start the show: serves this folder locally and opens the control window.
# Needs nothing beyond macOS itself (+ Google Chrome, recommended).
# Close this Terminal window (or press Ctrl+C) to stop.
cd "$(dirname "$0")" || exit 1
PORT=8123
URL="http://127.0.0.1:$PORT/control.html"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Something is already serving on port $PORT (probably an earlier start.command window)."
  echo "Opening the show with it. If the page looks wrong, close the other window and run this again."
else
  /usr/bin/perl server.pl "$PORT" &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null' EXIT
  sleep 1
  if ! kill -0 "$SERVER" 2>/dev/null; then
    echo "The local server failed to start."; read -r -p "Press Enter to close."; exit 1
  fi
fi

if open -Ra "Google Chrome" 2>/dev/null; then
  open -a "Google Chrome" "$URL"
else
  echo "Google Chrome not found - opening the default browser instead (Chrome is the tested browser)."
  open "$URL"
fi

echo "Oasis is running."
echo "  Show control: $URL"
echo "  Effects lab:  http://127.0.0.1:$PORT/index.html"
echo "Ctrl+C or close this window to stop."
[ -n "$SERVER" ] && wait "$SERVER"
