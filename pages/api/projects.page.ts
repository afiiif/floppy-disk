import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const cursor = parseInt(req.query.cursor as string) || 0;
  const pageSize = 5;

  const data = Array(pageSize)
    .fill(0)
    .map((_, i) => {
      return {
        name: 'Project ' + (i + cursor) + ` (server time: ${Date.now()})`,
        id: i + cursor,
      };
    });

  const nextId = cursor < 10 ? data[data.length - 1].id + 1 : null;
  const previousId = cursor > -10 ? data[0].id - pageSize : null;

  setTimeout(() => res.json({ data, nextId, previousId }), 1000);
}
