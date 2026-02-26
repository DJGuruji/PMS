/**
 * Recursively converts BigInt values to strings so they are JSON-serializable.
 * Next.js `NextResponse.json()` uses native JSON.stringify which cannot handle BigInt.
 */
export function serializeBigInt<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === 'bigint') {
    return value.toString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInt) as unknown as T;
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      result[key] = serializeBigInt((value as Record<string, unknown>)[key]);
    }
    return result as unknown as T;
  }

  return value;
}

/**
 * Shorthand: serialize a single project object (most-used case).
 */
export function serializeProject<T extends object>(project: T): T {
  return serializeBigInt(project);
}
