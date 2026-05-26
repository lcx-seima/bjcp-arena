import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";
import { defaultAllowedOrigins } from "./config.js";

export interface CreateAppOptions {
  allowedOrigins?: string[];
}

export function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const allowedOrigins = options.allowedOrigins ?? defaultAllowedOrigins;

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: allowedOrigins,
  });

  app.get(
    pingPath,
    {
      schema: {
        response: {
          200: pingResultSchema,
        },
        summary: "Check API reachability",
        tags: ["system"],
      },
    },
    async (): Promise<PingResult> => {
      return {
        message: "pong",
        service: "bjcp-arena-api",
      };
    }
  );

  return app;
}
