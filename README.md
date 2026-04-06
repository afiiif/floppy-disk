# FloppyDisk.ts 💾

A unified state model for **sync & async** data.

Built on the patterns you know. Refined into something simpler.\
Inspired by [Zustand](https://zustand.docs.pmnd.rs) & [TanStack-Query](https://tanstack.com/query).

_Fine-grained reactivity, minimal boilerplate, zero dependencies._

Demo: https://afiiif.github.io/floppy-disk/

**Installation:**

```
npm install floppy-disk
```

**Read the docs → https://floppy-disk.vercel.app**

<br>

---

**Like Zustand, but has additional capabilities:**
- No selectors: automatically optimizes re-renders
- Store events: `onFirstSubscribe`, `onSubscribe`, `onUnsubscribe`, `onLastUnsubscribe`
- Easier to set initial state on SSR/SSG
- Smaller bundle

**Like TanStack Query, but:**
- DX is very similar to Zustand → One mental model for sync & async
- Much smaller bundle than TanStack Query → With nearly the same capabilities

---

<br>

## Store (Global State)

A store is a global state container that can be used both **inside and outside** React.\
With FloppyDisk, creating a store is simple:

```tsx
import { createStore } from "floppy-disk/react";

const useLawn = createStore({
  plants: 3,
  zombies: 1,
});
```

Use it inside a component:

```tsx
function MyPlants() {
  const { plants } = useLawn(); // No selectors needed.

  return <div>Plants: {plants}</div>; // Only re-render when plants state changes
}
```

Update the state **anywhere**:

```tsx
const addPlant = () => {
  useLawn.setState(prev => ({ plants: prev.plants + 1 }));
};
```

## Query Store for Async State

Create a query store for async data with `createQuery`:

```tsx
import { createQuery } from "floppy-disk/react";

const plantDetailQuery = createQuery(
  async ({ id }) => {
    const res = await fetch(`/api/plants/${id}`);
    return res.json();
  },
);
```

Use it in your component:

```tsx
function PlantDetail({ id }) {
  const usePlantDetailQuery = plantDetailQuery({ id });
  const { data, error } = usePlantDetailQuery();

  if (!data && !error) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Name: {data.name}, damage: {data.damage}</div>;
}
```

---

Read the docs → https://floppy-disk.vercel.app
