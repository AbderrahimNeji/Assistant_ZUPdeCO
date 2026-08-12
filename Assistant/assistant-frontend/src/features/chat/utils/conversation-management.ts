import type { Conversation, Message } from "@/features/chat/types";

/** Sort pinned conversations first, then by most recently updated. */
export function sortConversations(
  conversations: Conversation[],
): Conversation[] {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

export function buildConversationMarkdown(
  title: string,
  messages: Message[],
): string {
  const safeTitle = title.trim() || "Conversation";
  const lines: string[] = [`# ${safeTitle}`, ""];

  if (messages.length === 0) {
    lines.push("_No messages in this conversation._", "");
    return lines.join("\n");
  }

  for (const message of messages) {
    const heading = message.role === "user" ? "You" : "Assistant";
    lines.push(`## ${heading}`, "", message.content.trim(), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function slugifyFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "conversation";
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Opens a print-friendly window so the user can Save as PDF.
 * Preserves conversation markdown source with pre-wrap formatting.
 */
export function exportConversationPdf(
  title: string,
  markdown: string,
): void {
  const safeTitle = title.trim() || "Conversation";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeTitle)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 2rem;
      font-family: Georgia, "Times New Roman", serif;
      color: #1b1640;
      line-height: 1.55;
      background: #fff;
    }
    h1 {
      font-family: system-ui, sans-serif;
      font-size: 1.5rem;
      margin: 0 0 1.25rem;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.875rem;
      margin: 0;
    }
    @media print {
      body { padding: 0.75in; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(safeTitle)}</h1>
  <pre>${escapeHtml(markdown)}</pre>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error(
      "Unable to open the print window. Allow pop-ups and try again.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Give the document a tick to paint before invoking print.
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
