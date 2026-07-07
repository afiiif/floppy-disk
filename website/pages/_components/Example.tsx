const GITHUB_URL = "afiiif/floppy-disk-site";

type Props = {
  path: string;
};
export default function Example({ path }: Props) {
  return (
    <div className="nextra-callout nx-overflow-x-auto nx-mt-6 nx-flex nx-rounded-lg nx-border nx-py-2 ltr:nx-pr-4 rtl:nx-pl-4 contrast-more:nx-border-current contrast-more:dark:nx-border-current nx-border-blue-200 nx-bg-blue-100 nx-text-blue-900 dark:nx-border-blue-200/30 dark:nx-bg-blue-900/30 dark:nx-text-blue-200">
      <div
        className="nx-select-none nx-text-xl ltr:nx-pl-3 ltr:nx-pr-2 rtl:nx-pr-3 rtl:nx-pl-2"
        style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }}
      >
        ℹ️
      </div>
      <div className="nx-w-full nx-min-w-0 nx-leading-7">
        <p className="nx-mt-6 nx-leading-7 first:nx-mt-0">
          Example:{" "}
          <a
            href={`https://codesandbox.io/p/sandbox/github/${GITHUB_URL}/tree/main/examples/${path}`}
            target="_blank"
            rel="noreferrer"
            className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
          >
            https://codesandbox.io/.../examples/{path}
            <span className="nx-sr-only nx-select-none"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </div>
  );
}
