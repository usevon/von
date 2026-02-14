import {
  BadRequestError,
  hashSha256,
  hmacSign,
  timingSafeEqual,
} from "@usevon/utils";
import { and, eq, gt, lt, or, type SQL, type SQLWrapper } from "drizzle-orm";
import { env } from "@/env";
import type { CursorPaginationQueryType } from "@/lib/models";

const CURSOR_VERSION = "v1";
const CURSOR_SIGNATURE_LENGTH = 24;
const CURSOR_SCOPE_HASH_LENGTH = 16;
const CURSOR_MAX_LENGTH = 256;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURSOR_REGEX =
  /^v1\.[0-9a-z]+\.[0-9a-f-]{36}\.[ad]\.[0-9a-f]{16}\.[0-9a-f]{24}$/i;
const SCOPE_HASH_REGEX = /^[0-9a-f]{16}$/i;
const CURSOR_SIGNATURE_REGEX = /^[0-9a-f]{24}$/i;

export const PAGINATION_ERROR_CODES = {
  INVALID_CURSOR: "Invalid cursor",
} as const;

export type CursorSort = "asc" | "desc";

export type CursorPageInput = {
  limit: number;
  cursor: string | null;
};

export type CursorPosition = {
  createdAt: Date;
  id: string;
};

type CursorInput = CursorPosition & {
  sort: CursorSort;
  scopeHash: string;
};

type CursorListQueryArgs<Row> = {
  pagination: CursorPageInput;
  sort: CursorSort;
  scope: unknown;
  createdAtColumn: SQLWrapper;
  idColumn: SQLWrapper;
  baseCondition: SQL<unknown>;
  fetchRows: (where: SQL<unknown>, limit: number) => Promise<Row[]>;
  toCursorPosition: (row: Row) => CursorPosition;
};

export const toCursorPageInput = (
  input: CursorPaginationQueryType
): CursorPageInput => ({
  limit: input.limit ?? 20,
  cursor: input.cursor ?? null,
});

const invalidCursor = (): never => {
  throw new BadRequestError(PAGINATION_ERROR_CODES.INVALID_CURSOR);
};

const sortToDirection = (sort: CursorSort): "a" | "d" =>
  sort === "asc" ? "a" : "d";

const directionToSort = (direction: string): CursorSort =>
  direction === "a" ? "asc" : "desc";

const signCursor = (unsigned: string): string =>
  hmacSign(unsigned, env.BETTER_AUTH_SECRET).slice(0, CURSOR_SIGNATURE_LENGTH);

export const buildCursorScopeHash = (scope: unknown): string =>
  hashSha256(JSON.stringify(scope)).slice(0, CURSOR_SCOPE_HASH_LENGTH);

export const encodeCursor = (input: CursorInput): string => {
  if (!UUID_REGEX.test(input.id)) {
    throw new Error("Cursor id must be a UUID");
  }
  if (!SCOPE_HASH_REGEX.test(input.scopeHash)) {
    throw new Error("Cursor scope hash must be 16 hex characters");
  }

  const createdAtMs = input.createdAt.getTime();
  if (!Number.isFinite(createdAtMs) || createdAtMs < 0) {
    throw new Error("Cursor createdAt is invalid");
  }

  const timestamp = Math.floor(createdAtMs).toString(36);
  const direction = sortToDirection(input.sort);
  const unsigned = `${CURSOR_VERSION}.${timestamp}.${input.id}.${direction}.${input.scopeHash}`;
  const signature = signCursor(unsigned);

  return `${unsigned}.${signature}`;
};

export const decodeCursor = (
  cursor: string | null,
  expected: { sort: CursorSort; scopeHash: string }
): CursorPosition | null => {
  if (!cursor) {
    return null;
  }

  if (cursor.length > CURSOR_MAX_LENGTH || !CURSOR_REGEX.test(cursor)) {
    invalidCursor();
  }

  const parts = cursor.split(".");
  if (parts.length !== 6) {
    invalidCursor();
  }

  const [version, timestamp, id, direction, scopeHash, signature] = parts;
  const hasAllParts = [
    version,
    timestamp,
    id,
    direction,
    scopeHash,
    signature,
  ].every(Boolean);
  if (!hasAllParts) {
    invalidCursor();
  }

  if (version !== CURSOR_VERSION || !UUID_REGEX.test(id)) {
    invalidCursor();
  }

  if (!SCOPE_HASH_REGEX.test(scopeHash)) {
    invalidCursor();
  }

  if (!CURSOR_SIGNATURE_REGEX.test(signature)) {
    invalidCursor();
  }

  const unsigned = `${version}.${timestamp}.${id}.${direction}.${scopeHash}`;
  const expectedSignature = signCursor(unsigned);
  if (!timingSafeEqual(expectedSignature, signature)) {
    invalidCursor();
  }

  if (directionToSort(direction) !== expected.sort) {
    invalidCursor();
  }

  if (scopeHash !== expected.scopeHash) {
    invalidCursor();
  }

  const createdAtMs = Number.parseInt(timestamp, 36);
  if (!Number.isFinite(createdAtMs) || createdAtMs < 0) {
    invalidCursor();
  }

  const createdAt = new Date(createdAtMs);
  if (Number.isNaN(createdAt.getTime())) {
    invalidCursor();
  }

  return { createdAt, id };
};

export const buildCursorCondition = (
  createdAtColumn: SQLWrapper,
  idColumn: SQLWrapper,
  cursor: CursorPosition,
  sort: CursorSort
): SQL<unknown> => {
  const createdAtCompare =
    sort === "asc"
      ? gt(createdAtColumn, cursor.createdAt)
      : lt(createdAtColumn, cursor.createdAt);
  const idCompare =
    sort === "asc" ? gt(idColumn, cursor.id) : lt(idColumn, cursor.id);

  return or(
    createdAtCompare,
    and(eq(createdAtColumn, cursor.createdAt), idCompare)
  ) as SQL<unknown>;
};

export const sliceCursorPage = <T>(rows: T[], limit: number) => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    hasMore,
    lastItem: items.at(-1) ?? null,
  };
};

export const runCursorListQuery = async <Row>(
  args: CursorListQueryArgs<Row>
): Promise<{ items: Row[]; nextCursor: string | null }> => {
  const scopeHash = buildCursorScopeHash(args.scope);
  const cursor = decodeCursor(args.pagination.cursor, {
    sort: args.sort,
    scopeHash,
  });

  const where = cursor
    ? (and(
        args.baseCondition,
        buildCursorCondition(
          args.createdAtColumn,
          args.idColumn,
          cursor,
          args.sort
        )
      ) ?? args.baseCondition)
    : args.baseCondition;

  const rows = await args.fetchRows(where, args.pagination.limit + 1);
  const { items, hasMore, lastItem } = sliceCursorPage(
    rows,
    args.pagination.limit
  );

  return {
    items,
    nextCursor:
      hasMore && lastItem
        ? encodeCursor({
            ...args.toCursorPosition(lastItem),
            sort: args.sort,
            scopeHash,
          })
        : null,
  };
};
