import { createMutation, createQuery } from 'floppy-disk/react';

export function meta() {
  return [
    { title: 'FloppyDisk.JS for Async State Management' },
    { name: 'description', content: 'FloppyDisk.JS for async state management' },
  ];
}

export default function AsyncStateFloppyDisk() {
  console.info(createQuery, createMutation);
  return (
    <>
      {/* TODO */}
      <div>AsyncStateFloppyDisk</div>
    </>
  );
}
