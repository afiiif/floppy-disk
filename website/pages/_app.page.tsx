import { useRouter } from "next/router";
import "../styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const { route } = useRouter();
  return (
    <>
      {(route === "/" || route.startsWith("/examples")) && <div className="full-width-page" />}
      <Component {...pageProps} />
    </>
  );
}
