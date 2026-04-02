export const basicQueryFn1 = async () => {
  console.info("[tanstack]", "basicQueryFn called");
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { c: { d: "always-same" } },
  };
};
export const basicQueryFn2 = async () => {
  console.info("[floppy-disk]", "basicQueryFn called");
  await new Promise((r) => setTimeout(r, 2000));
  return {
    a: Math.random(),
    b: { c: { d: "always-same" } },
  };
};

export const keyedQueryFn1 = async ({ id }: { id: number }) => {
  console.info("[tanstack]", "keyedQueryFn called", `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error("Boom!");
  }
  return {
    a: Math.random(),
    b: { id, value: "always-same" },
  };
};
export const keyedQueryFn2 = async ({ id }: { id: number }) => {
  console.info("[floppy-disk]", "keyedQueryFn called", `id: ${id}`);
  await new Promise((r) => setTimeout(r, 2000));
  if (id === 3) {
    throw new Error("Boom!");
  }
  return {
    a: Math.random(),
    b: { id, value: "always-same" },
  };
};

// ---

const randomString = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const infQueryFn1 = async ({ cursor }: { cursor?: string }) => {
  console.info("[tanstack]", "infQueryFn called", `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ""}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString() as string | undefined,
    },
  };
};
export const infQueryFn2 = async ({ cursor }: { cursor?: string }) => {
  console.info("[floppy-disk]", "infQueryFn called", `cursor: ${cursor}`);
  await new Promise((r) => setTimeout(r, 2000));
  return {
    data: [...Array(10).keys()].map((i) => ({
      id: `${randomString()}${cursor ? `-${cursor}` : ""}-${i}`,
      foo: Math.random(),
      bar: Math.random() < 0.5,
    })),
    meta: {
      currentCursor: cursor,
      nextCursor: randomString() as string | undefined,
    },
  };
};

// ---

let mutationFn1Attemp = 0;
export const mutationFn1 = async ({ foo, bar }: { foo: number; bar?: string }) => {
  console.info("[tanstack]", "mutationFn called", { foo, bar });
  await new Promise((r) => setTimeout(r, 2000));
  if (++mutationFn1Attemp % 4 === 0) throw new Error("Mutation error");
  return {
    data: {
      a: Math.random(),
      b: randomString(),
    },
  };
};

let mutationFn2Attemp = 0;
export const mutationFn2 = async ({ foo, bar }: { foo: number; bar?: string }) => {
  console.info("[tanstack]", "mutationFn called", { foo, bar });
  await new Promise((r) => setTimeout(r, 2000));
  if (++mutationFn2Attemp % 4 === 0) throw new Error("Mutation error");
  return {
    data: {
      a: Math.random(),
      b: randomString(),
    },
  };
};
