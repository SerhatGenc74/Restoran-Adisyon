import type { FastifyReply, FastifyRequest } from "fastify";
import createError from "http-errors";

/**
 * Prisma hata kodlarini kontrol eder.
 */
export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Record<string, unknown>).code === code
  );
}

interface BusinessError extends Error {
  code: string;
}

/**
 * Belirtilen BusinessError sinifinina ve switch tablosuna gore
 * HTTP yaniti donduuren standart hata isleyici.
 */
export function createErrorHandler<TError extends BusinessError>(
  isInstance: (error: unknown) => error is TError,
  codeMap: Partial<Record<string, (reply: FastifyReply) => unknown>>
) {
  return function handleError(error: unknown, reply: FastifyReply) {
    if (isInstance(error)) {
      // In fastify 4+ with sensible, throw createError to be caught by global handler
      const err = createError(400, error.message);
      (err as any).code = error.code;
      throw err;
    }
    if (isPrismaError(error, "P2025")) throw createError(404, "Kayit bulunamadi.");
    if (isPrismaError(error, "P2002")) throw createError(409, "Bu kayit zaten mevcut.");
    if (isPrismaError(error, "P2003")) throw createError(409, "Iliskili kayit bulunamadi.");
    throw error;
  };
}
