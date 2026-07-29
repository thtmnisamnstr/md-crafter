import katex from 'katex';

interface MathProps {
  value?: string;
  inline?: boolean;
  children?: React.ReactNode;
  displayMode?: boolean;
}

function toExpression(value?: string, children?: React.ReactNode): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof children === 'string' && children.trim()) return children.trim();
  if (Array.isArray(children)) {
    const merged = children.map((child) => (typeof child === 'string' ? child : '')).join('');
    if (merged.trim()) return merged.trim();
  }
  return '';
}

export function Math({ value, inline = false, displayMode, children }: MathProps) {
  const expression = toExpression(value, children);

  if (!expression) {
    return null;
  }

  try {
    const html = katex.renderToString(expression, {
      throwOnError: false,
      displayMode: typeof displayMode === 'boolean' ? displayMode : !inline,
      strict: 'warn',
      trust: false,
    });

    if (inline) {
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return (
      <div className="my-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    );
  } catch {
    return (
      <code style={{ color: 'rgb(239, 68, 68)' }}>
        {expression}
      </code>
    );
  }
}
