import { config } from "../config";
import { sessionId } from "../ids";

export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

export class RequestTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`request timed out after ${timeoutMs} ms`);
    this.name = "RequestTimeoutError";
  }
}

export interface GqlOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function gql<T>(
  operationName: string,
  query: string,
  variables: Record<string, unknown> = {},
  { timeoutMs = 10_000, fetchImpl = fetch }: GqlOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${config.gatewayUrl}/graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-id": sessionId,
        "x-app-version": config.appVersion,
      },
      body: JSON.stringify({ operationName, query, variables }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new RequestTimeoutError(timeoutMs);
    }
    throw err;
  }
  const body = (await res.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
  if (body.errors?.length) {
    const e = body.errors[0]!;
    throw new GraphQLRequestError(e.message, e.extensions?.code ?? "INTERNAL");
  }
  if (!body.data) throw new GraphQLRequestError("empty response", "INTERNAL");
  return body.data;
}
