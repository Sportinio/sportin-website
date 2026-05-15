import type { PRRef } from "@/lib/types";

const STATUS_COLOR: Record<PRRef["status"], string> = {
  merged: "text-ok",
  open: "text-warn",
  draft: "text-warn/70",
  closed: "text-muted line-through",
};

export function PRList({ prs }: { prs: PRRef[] }) {
  if (!prs.length) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <ul className="space-y-1">
      {prs.map((pr) => (
        <li key={pr.url} className="truncate text-xs">
          <a
            href={pr.url}
            target="_blank"
            rel="noreferrer"
            className={`hover:underline ${STATUS_COLOR[pr.status]}`}
            title={pr.title}
          >
            #{pr.number} {pr.title}
          </a>
          {pr.author ? <span className="ml-1 text-muted">· {pr.author}</span> : null}
        </li>
      ))}
    </ul>
  );
}
