import { env } from "../config/env.js";
import { AppError } from "./app-error.js";

type RequestJsonOptions = RequestInit & {
  timeoutMs?: number;
  provider: string;
};

export async function requestJson<T>(url: string, options: RequestJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? env.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers
      }
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) as unknown : null;

    if (!response.ok) {
      throw new AppError(
        response.status,
        `${options.provider} request failed`,
        `${options.provider.toUpperCase()}_REQUEST_FAILED`,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, `${options.provider} request timed out`, `${options.provider.toUpperCase()}_TIMEOUT`);
    }

    throw new AppError(502, `${options.provider} request failed`, `${options.provider.toUpperCase()}_REQUEST_FAILED`);
  } finally {
    clearTimeout(timeout);
  }
}
