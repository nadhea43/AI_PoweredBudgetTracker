from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from dotenv import load_dotenv
from services import analyze_profile

load_dotenv()
DEFAULT_PORT = int(os.environ.get("BACKEND_PORT", "8000"))

class FinancialAnalysisHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path in {"/", "/api/health"}:
            self._send_json(200, {"status": "ok", "service": "kyouth finance backend"})
        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self) -> None:
        if self.path == "/api/analyze":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(raw_body) if raw_body else {}
                
                result = analyze_profile(payload)
                self._send_json(200, result)
            except json.JSONDecodeError:
                self._send_json(400, {"error": "Invalid JSON string received"})
            except Exception as err:
                print(f"Server runtime crash intercept: {err}")
                self._send_json(500, {"error": str(err)})
        else:
            self._send_json(404, {"error": "Endpoint channel not mapped"})

def main() -> None:
    server_address = ("", DEFAULT_PORT)
    server = ThreadingHTTPServer(server_address, FinancialAnalysisHandler)
    print(f"Finance gap detection backend listening on http://localhost:{DEFAULT_PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down backend server engine cleanly...")
        server.server_close()

if __name__ == "__main__":
    main()