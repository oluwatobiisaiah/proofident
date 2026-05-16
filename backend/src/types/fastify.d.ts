import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
    auth?: {
      userId: string;
      tokenVersion: number;
      sessionId?: string;
    };
    idempotency?: {
      key: string;
      recordId: string;
      requestHash: string;
      replayed: boolean;
    };
  }
}
