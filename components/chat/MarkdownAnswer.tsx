import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = {
  content: string;
};

export default function MarkdownAnswer({content}: Props) {
  return (
    <div className="prose prose-zinc max-w-none overflow-x-auto dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
