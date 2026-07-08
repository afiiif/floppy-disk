/* eslint-disable react-hooks/rules-of-hooks */
import { useRouter } from "next/router";
import { useConfig } from "nextra-theme-docs";

/** @type {import('nextra-theme-docs').DocsThemeConfig} */
const themeConfig = {
  docsRepositoryBase: "https://github.com/afiiif/yuustate/blob/main/website",
  project: { link: "https://github.com/afiiif/yuustate" },
  logo: (
    <div className="group flex items-center gap-4 py-2.5 pr-2.5 text-xl font-bold">
      <img
        src="/yuustate-icon.webp"
        width={24}
        height={24}
        className="-rotate-12 transition-transform group-hover:rotate-12 group-hover:scale-125"
      />
      <div className="tracking-wider">
        YUU<span className="opacity-70">STATE</span>
      </div>
    </div>
  ),
  useNextSeoProps: () => {
    const { route } = useRouter();
    if (route === "/" || route === "/blog") return { titleTemplate: "%s" };
    if (route.startsWith("/blog/")) return { titleTemplate: "%s – 📚 YuuState Blog" };
    return { titleTemplate: "%s – YuuState" };
  },
  head: () => {
    const DEFAULT_KEYWORDS =
      "YuuState, React, State Management, JS, JavaScript, NPM, Store, Async State";
    const { frontMatter } = useConfig();
    const ogImage = frontMatter.image || "https://yuustate.vercel.app/yuustate-banner.jpg";
    const { route } = useRouter();
    const isBlog = route.startsWith("/blog");
    const author =
      typeof frontMatter.author === "object" ? frontMatter.author[0].name : frontMatter.author;
    return (
      <>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="og:type" content={isBlog ? "article" : "website"} />
        <meta name="keywords" content={frontMatter.keywords || DEFAULT_KEYWORDS} />
        {frontMatter.date && <meta name="article:published_time" content={frontMatter.date} />}
        {isBlog && author && <meta name="article:author" content={author} />}
        {!isBlog && <meta name="author" content="Muhammad Afifudin" />}
      </>
    );
  },
  gitTimestamp: ({ timestamp }) => {
    const { route, locale } = useRouter();
    if (route === "/") return null;
    return (
      <>
        Last updated on{" "}
        <time dateTime={timestamp.toISOString()}>
          {timestamp.toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </>
    );
  },
  sidebar: {
    titleComponent: ({ title }) => (title.endsWith("Introduction") ? "Introduction" : title),
  },
  feedback: {
    content: () => {
      const { route, locale } = useRouter();
      if (route.startsWith("/blog/")) return null;
      return "Question? Give us feedback →";
    },
  },
  editLink: {
    text: () => {
      const { route, locale } = useRouter();
      if (route.startsWith("/blog/")) return null;
      return "Edit this page on GitHub →";
    },
  },
  footer: {
    text: () => {
      return (
        <div>
          Library by{" "}
          <a
            href="https://afiiif.github.io"
            target="_blank"
            className="hover:text-slate-900 hover:underline dark:hover:text-white"
          >
            Afifudin
          </a>{" "}
          🇮🇩
        </div>
      );
    },
  },
};

export default themeConfig;
