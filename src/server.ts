import http from "http";
import handler from "serve-handler";
import { AddressInfo } from "net";
import { EventEmitter } from "events";

export class ViewerServer extends EventEmitter {
  private server: http.Server;
  private port: number = 0;

  constructor(private publicDir: string) {
    super();
    this.server = http.createServer((request, response) => {
      console.log(`[Server] ${request.method} ${request.url}`);
      return handler(request, response, {
        public: this.publicDir,
        headers: [
          {
            source: "**/*",
            headers: [
              { key: "Access-Control-Allow-Origin", value: "*" },
              { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
              { key: "Access-Control-Allow-Headers", value: "*" }
            ]
          }
        ]
      }).catch(error => {
        console.error('[Server] Error:', error);
        response.statusCode = 500;
        response.end(String(error));
      });
    });
  }

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(0, () => {
        const address = this.server.address() as AddressInfo;
        this.port = address.port;
        console.log(`[Server] Started on port ${this.port}`);
        console.log(`[Server] Serving files from ${this.publicDir}`);
        this.emit("ready", this.port);
        resolve(this.port);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }
}
