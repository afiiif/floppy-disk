import { PLANTS, ZOMBIES } from "./_dummy-data";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const applyFilters = <T extends { name: string; type?: string }>(
  data: T[],
  { search, type }: QueryParams,
): T[] => {
  let result = data;

  if (search) {
    const keyword = search.toLowerCase();
    result = result.filter((item) => item.name.toLowerCase().includes(keyword));
  }

  if (type) {
    result = result.filter((item) => item.type === type);
  }

  return result;
};

// ---

type PaginationParams = {
  page?: number;
  limit?: number;
};

type QueryParams = PaginationParams & {
  search?: string;
  type?: string;
};

type PaginatedResult<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const paginate = <T>(
  data: T[],
  { page = 1, limit = 5 }: PaginationParams = {},
): PaginatedResult<T> => {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);

  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * limit;
  const end = start + limit;

  return {
    data: data.slice(start, end),
    page: safePage,
    limit,
    total,
    totalPages,
  };
};

export const getPlants = async (params: QueryParams = {}) => {
  await delay(2000);
  const filtered = applyFilters(PLANTS, params);
  return paginate(filtered, params);
};

export const getZombies = async (params: QueryParams = {}) => {
  await delay(2000);
  const filtered = applyFilters(ZOMBIES, params);
  return paginate(filtered, params);
};

// ---

type CursorParams = {
  cursor?: string | null;
  limit?: number;
  search?: string;
  type?: string;
};

type CursorResult<T> = {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
};

const encodeCursor = (index: number) => btoa(String(index));
const decodeCursor = (cursor?: string | null) => (cursor ? Number(atob(cursor)) : 0);

const paginateCursor = <T>(data: T[], { cursor, limit = 10 }: CursorParams): CursorResult<T> => {
  const startIndex = decodeCursor(cursor);
  const endIndex = startIndex + limit;

  const sliced = data.slice(startIndex, endIndex);

  const nextCursor = endIndex < data.length ? encodeCursor(endIndex) : null;

  const prevCursor = startIndex > 0 ? encodeCursor(Math.max(0, startIndex - limit)) : null;

  return {
    data: sliced,
    nextCursor,
    prevCursor,
    hasNext: endIndex < data.length,
    hasPrev: startIndex > 0,
  };
};

export const getPlantsCursor = async (params: CursorParams = {}) => {
  await delay(2000);
  const filtered = applyFilters(PLANTS, params);
  return paginateCursor(filtered, params);
};

export const getZombiesCursor = async (params: CursorParams = {}) => {
  await delay(2000);
  const filtered = applyFilters(ZOMBIES, params);
  return paginateCursor(filtered, params);
};

// ---

export const getPlantById = async (id: number) => {
  await delay(2000);
  return PLANTS.find((plant) => plant.id === id);
};

export const getZombieById = async (id: number) => {
  await delay(2000);
  return ZOMBIES.find((plant) => plant.id === id);
};
