/**
 * Cloudflare Pages Functions 타입 정의
 *
 * wrangler types 명령으로 자동 생성 가능:
 * npx wrangler types --path='./functions/types.d.ts'
 */

/// <reference types="@cloudflare/workers-types" />

declare module "@cloudflare/workers-types" {
  interface EventContext<Env, P, Data> {
    request: Request;
    functionPath: string;
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
    next(input?: Request | string, init?: RequestInit): Promise<Response>;
    env: Env;
    params: P;
    data: Data;
  }

  interface PagesFunction<
    Env = unknown,
    Params extends string = any,
    Data extends Record<string, unknown> = Record<string, unknown>
  > {
    (context: EventContext<Env, Params, Data>): Response | Promise<Response>;
  }
}
