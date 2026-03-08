import http from "http";
import appHandler from "./api/index";

const PORT = 3000;

const server = http.createServer((req, res) => {
  appHandler(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
