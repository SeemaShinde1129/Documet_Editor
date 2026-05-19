export type DocumentExportInput = {
  title: string;
  content: string;
};

const DEFAULT_DOCUMENT_TITLE = "untitled-document";
const UTF8_BOM = "\uFEFF";

const filenameReservedCharacters = /[<>:"/\\|?*\u0000-\u001F]/g;
const whitespaceCharacters = /\s+/g;
const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;

const sanitizeFilename = (title: string, extension: "txt" | "md") => {
  const sanitizedTitle = title
    .trim()
    .replace(filenameReservedCharacters, "")
    .replace(whitespaceCharacters, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${sanitizedTitle || DEFAULT_DOCUMENT_TITLE}.${extension}`;
};

const downloadFile = ({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}) => {
  const blob = new Blob([UTF8_BOM, content], {
    type: `${mimeType};charset=utf-8`,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
};

const isHtmlContent = (content: string) => htmlTagPattern.test(content);

const parseHtml = (content: string) => {
  const parser = new DOMParser();

  return parser.parseFromString(content, "text/html");
};

const normalizeTextSpacing = (text: string) => {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
};

const htmlToPlainText = (content: string) => {
  if (!isHtmlContent(content)) {
    return content.trim();
  }

  const documentBody = parseHtml(content).body;

  return normalizeTextSpacing(documentBody.innerText || documentBody.textContent || "");
};

const nodeToMarkdown = (node: Node, orderedListIndex?: number): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const childMarkdown = Array.from(element.childNodes)
    .map((childNode) => nodeToMarkdown(childNode))
    .join("");

  switch (tagName) {
    case "h1":
      return `# ${childMarkdown.trim()}\n\n`;
    case "h2":
      return `## ${childMarkdown.trim()}\n\n`;
    case "h3":
      return `### ${childMarkdown.trim()}\n\n`;
    case "h4":
      return `#### ${childMarkdown.trim()}\n\n`;
    case "h5":
      return `##### ${childMarkdown.trim()}\n\n`;
    case "h6":
      return `###### ${childMarkdown.trim()}\n\n`;
    case "p":
      return childMarkdown.trim() ? `${childMarkdown.trim()}\n\n` : "";
    case "strong":
    case "b":
      return `**${childMarkdown.trim()}**`;
    case "em":
    case "i":
      return `_${childMarkdown.trim()}_`;
    case "code":
      return `\`${childMarkdown.trim()}\``;
    case "blockquote":
      return `${childMarkdown
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    case "br":
      return "\n";
    case "ul":
      return `${Array.from(element.children)
        .map((childElement) => nodeToMarkdown(childElement))
        .join("")}\n`;
    case "ol":
      return `${Array.from(element.children)
        .map((childElement, index) => nodeToMarkdown(childElement, index + 1))
        .join("")}\n`;
    case "li":
      return `${orderedListIndex ? `${orderedListIndex}.` : "-"} ${childMarkdown.trim()}\n`;
    default:
      return childMarkdown;
  }
};

const htmlToMarkdown = (content: string) => {
  if (!isHtmlContent(content)) {
    return content.trim();
  }

  const documentBody = parseHtml(content).body;
  const markdown = Array.from(documentBody.childNodes)
    .map((node) => nodeToMarkdown(node))
    .join("");

  return normalizeTextSpacing(markdown);
};

export const exportAsText = ({ title, content }: DocumentExportInput) => {
  downloadFile({
    filename: sanitizeFilename(title, "txt"),
    content: htmlToPlainText(content),
    mimeType: "text/plain",
  });
};

export const exportAsMarkdown = ({ title, content }: DocumentExportInput) => {
  downloadFile({
    filename: sanitizeFilename(title, "md"),
    content: htmlToMarkdown(content),
    mimeType: "text/markdown",
  });
};
