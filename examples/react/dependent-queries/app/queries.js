import { createQuery } from 'floppy-disk';

const getCountries = async ({ q }) => {
  const res = await fetch(`/api/countries?q=${encodeURIComponent(q)}`);
  const resJson = await res.json();
  if (res.ok) return resJson;
  throw resJson;
};

const getProvinces = async ({ q, countryId }) => {
  const res = await fetch(`/api/provinces?q=${encodeURIComponent(q)}&countryId=${countryId}`);
  const resJson = await res.json();
  if (res.ok) return resJson;
  throw resJson;
};

const getCities = async ({ q, countryId, provinceId }) => {
  const res = await fetch(
    `/api/countries?q=${encodeURIComponent(q)}&countryId=${countryId}&provinceId=${provinceId}`,
  );
  const resJson = await res.json();
  if (res.ok) return resJson;
  throw resJson;
};

export const useCountriesQuery = createQuery(getCountries, {
  select: (response) => response.records,
  enabled: ({ q }) => q,
});
export const useProvincesQuery = createQuery(getProvinces, {
  select: (response) => response.records,
  enabled: ({ q, countryId }) => q && countryId,
});
export const useCitiesQuery = createQuery(getCities, {
  select: (response) => response.records,
  enabled: ({ q, countryId, provinceId }) => q && countryId && provinceId,
});
