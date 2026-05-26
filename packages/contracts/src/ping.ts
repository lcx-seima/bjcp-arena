import { z } from "zod";

export const pingPath = "/api/ping" as const;

export const pingResultSchema = z.object({
  message: z.literal("pong"),
  service: z.literal("bjcp-arena-api"),
});

export type PingResult = z.infer<typeof pingResultSchema>;
