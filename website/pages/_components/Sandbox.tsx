const GITHUB_URL = "afiiif/floppy-disk-site/tree/main/examples";
const BASE_SANDBOX_URL = `https://stackblitz.com/github/${GITHUB_URL}`;

type Props = {
  path: string;
  file?: string;
};
export default function Sandbox({ path, file = "/index.jsx" }: Props) {
  return (
    <>
      <div className="pb-1.5 pt-4">
        <span className="opacity-70">Source: </span>
        <a
          href={`https://github.com/${GITHUB_URL}/${path}`}
          className="hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://github.com/{GITHUB_URL}/{path}
        </a>
      </div>

      <iframe
        style={{
          border: "1px solid rgba(0, 0, 0, 0.1)",
          borderRadius: 2,
          width: "100%",
          height: "calc(100vh - 8rem)",
          minHeight: "36rem",
          overflow: "hidden",
          background: "rgb(21, 21, 21)",
          margin: "0",
        }}
        src={`${BASE_SANDBOX_URL}/${path}?embed=1&autoresize=1&hidenavigation=1&file=${file}`}
        allowFullScreen
      />
    </>
  );
}
