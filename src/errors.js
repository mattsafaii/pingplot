export class PingplotError extends Error {
  constructor(message) {
    super(message);
    this.name = "PingplotError";
  }
}