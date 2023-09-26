import { NextResponse } from 'next/server';

import { countries, paginate } from '../data';

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLocaleLowerCase();
  const countryId = searchParams.get('countryId');
  const provinceId = searchParams.get('provinceId');
  if (!query || !countryId || !provinceId) {
    return NextResponse.json(
      { message: 'Please provide country id, province id, & query parameter' },
      { status: 400 },
    );
  }

  const provinces = countries.find((item) => item.id === countryId)?.provinces;
  if (!provinces) {
    return NextResponse.json({ message: `Country id "${countryId}" not found` }, { status: 404 });
  }

  const cities = provinces.find((item) => item.id === provinceId)?.cities;
  if (!cities) {
    return NextResponse.json({ message: `Province id "${provinceId}" not found` }, { status: 404 });
  }

  const { records, pagination } = paginate(
    cities.filter((item) => item.name.toLocaleLowerCase().includes(query)),
  );
  return NextResponse.json({
    records: records.map(({ id, name }) => ({ id, name })),
    pagination,
  });
}
