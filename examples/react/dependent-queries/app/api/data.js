import { faker } from '@faker-js/faker';

export const paginate = (data, page = 1, limit = 10) => {
  return {
    records: data.slice((page - 1) * limit, page * limit),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalRecords: data.length,
    },
  };
};

export const countries = [...Array(50)].map(() => {
  return {
    id: faker.string.alphanumeric(8),
    name: faker.lorem.words(2),
    provinces: [...Array(50)].map(() => {
      return {
        id: faker.string.alphanumeric(8),
        name: faker.lorem.words(2),
        cities: [...Array(50)].map(() => {
          return {
            id: faker.string.alphanumeric(8),
            name: faker.lorem.words(2),
          };
        }),
      };
    }),
  };
});
