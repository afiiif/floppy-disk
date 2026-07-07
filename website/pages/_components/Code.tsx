import { cn } from "@/utils/string";
import Link from "next/link";

type Props = {
  content: string;
  href?: string;
};
export default function Code({ content, href }: Props) {
  const className =
    "nx-border-black nx-border-opacity-[0.04] nx-bg-opacity-[0.03] nx-bg-black nx-break-words nx-rounded-md nx-border nx-py-0.5 nx-px-[.25em] nx-text-[.9em] dark:nx-border-white/10 dark:nx-bg-white/10";

  if (href) {
    return (
      <code>
        <Link
          href={`/docs/${href}`}
          className={cn(
            className,
            "hover:nx-text-primary-600 underline decoration-[hsl(var(--nextra-primary-hue)100%_45%/0.8)] decoration-dashed underline-offset-4 hover:decoration-[hsl(var(--nextra-primary-hue)100%_45%/1)]",
          )}
        >
          {content}
        </Link>
      </code>
    );
  }

  return <code className={className}>{content}</code>;
}
