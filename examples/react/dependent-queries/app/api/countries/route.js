import { NextResponse } from 'next/server';

import { countries, paginate } from '../data';

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLocaleLowerCase();
  if (!query) {
    return NextResponse.json({ message: 'Please provide a query parameter' }, { status: 400 });
  }

  const { records, pagination } = paginate(
    countries.filter((item) => item.name.toLocaleLowerCase().includes(query)),
  );
  return NextResponse.json({
    records: records.map(({ id, name }) => ({ id, name })),
    pagination,
  });
}
