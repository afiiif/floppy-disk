'use client';

import { useState } from 'react';
import { useDebounce } from 'react-power-ups';

import { useCitiesQuery, useCountriesQuery, useProvincesQuery } from './queries';

export default function AddressForm() {
  const [country, setCountry] = useState();
  const [province, setProvince] = useState();
  const [city, setCity] = useState();

  return (
    <main>
      <h1>Dependent Queries Example</h1>

      <Dropdown
        title="Country"
        value={country}
        onChange={setCountry}
        useQuery={useCountriesQuery}
      />
      <Dropdown
        title="Province"
        value={province}
        onChange={setProvince}
        useQuery={useProvincesQuery}
        queryParams={{ countryId: country?.id }}
      />
      <Dropdown
        title="City"
        value={city}
        onChange={setCity}
        useQuery={useCitiesQuery}
        queryParams={{ countryId: country?.id, provinceId: province?.id }}
      />
    </main>
  );
}

function Dropdown({ title, value, onChange, useQuery, queryParams }) {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 2000);
  const query = useQuery({ q: debouncedKeyword, ...queryParams });
  return (
    <div>
      <h2>{title}</h2>
      <div>Selected: {JSON.stringify(value) || '-'}</div>
      <div>
        <input
          type="text"
          placeholder={`Search ${title}`}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      {!!keyword && <DropdownMenu query={query} onChange={onChange} />}
    </div>
  );
}

function DropdownMenu({ query, onChange }) {
  const { isLoading, isSuccess, error, data = [] } = query;

  if (isLoading) {
    return <div>Loading... ⏳</div>;
  }

  if (isSuccess) {
    return data.length ? (
      <ul>
        {data.map((item) => (
          <li key={item.id}>
            <a onClick={() => onChange(item)} style={{ cursor: 'pointer' }}>
              {item.name}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <div>No data found</div>
    );
  }

  return <div>Error: {JSON.stringify(error, null, 2)}</div>;
}
