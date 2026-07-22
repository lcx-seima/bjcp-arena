import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const allowedElements = ["h4", "p", "br"];

export function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      remarkPlugins={[remarkBreaks]}
      skipHtml
      unwrapDisallowed
    >
      {children}
    </ReactMarkdown>
  );
}
