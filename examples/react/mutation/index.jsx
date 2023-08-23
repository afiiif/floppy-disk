import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { createMutation } from 'floppy-disk';

const useLoginMutation = createMutation(
  async ({ email, password }) => {
    const res = await fetch('https://reqres.in/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      mode: 'cors',
    });
    const resJson = await res.json();
    if (res.ok) return resJson;
    throw resJson;
  },
  {
    onSuccess: (response, variables) => {
      console.log(`Logged in as ${variables.email}`);
      console.log(`Access token: ${response.token}`);
    },
  },
);

function App() {
  const { mutate, isWaiting, error } = useLoginMutation();
  const emailRef = useRef();
  const passwordRef = useRef();

  return (
    <main>
      <h1>💾 Floppy Disk - Mutation</h1>

      <input type="email" ref={emailRef} defaultValue="eve.holt@reqres.in" />
      <input type="password" ref={passwordRef} />
      <div>{error?.error}</div>

      <button
        disabled={isWaiting}
        onClick={() => {
          mutate({ email: emailRef.current.value, password: passwordRef.current.value }).then(
            ({ response, error }) => {
              if (error) {
                alert(`Login failed\n${JSON.stringify(error, null, 2)}`);
              } else {
                alert('Login success');
              }
            },
          );
        }}
      >
        Login
      </button>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
