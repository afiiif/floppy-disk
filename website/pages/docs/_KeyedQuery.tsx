import { useState } from "react";
import { createQuery } from "floppy-disk/react";

import { getZombieById } from "./_utils";

const zombieQuery = createQuery(({ id }: { id: number }) => getZombieById(id));

export function KeyedQuery() {
  const [id, setId] = useState(3);

  const useZombieQuery = zombieQuery({ id });
  const { state, data, error } = useZombieQuery({ keepPreviousData: true });
  const isPrevData = !!data && state !== "SUCCESS";

  return (
    <section className="border-soft mt-4 rounded-xl border p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setId((p) => p - 1)}
            disabled={id <= 1}
          >
            {"<"}
          </button>
          <div>Zombie ID: {id}</div>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setId((p) => p + 1)}
            disabled={id >= 26}
          >
            {">"}
          </button>
        </div>
        {isPrevData && <div className="opacity-60">⏳ Getting zombie with id {id}</div>}
      </div>

      <div className="pt-4">
        {!data && !error && <div className="opacity-60">⏳ Loading...</div>}
        {!!error && <div className="text-red-500">Error</div>}
        {!!data && (
          <>
            <div>
              Name: <b className="font-semibold">{data.name}</b>
            </div>
            <div>
              Type: <b className="font-semibold">{data.type}</b>
            </div>
            <div>
              Speed: <b className="font-semibold">{data.speed}</b>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
