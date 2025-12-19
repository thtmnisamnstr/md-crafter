import { ReactNode } from 'react';

interface CodeGroupProps {
  children: ReactNode;
}

/**
 * CodeGroup component for MDX
 * Wraps code blocks, typically used to group related code examples
 * Similar to Tabs but specifically for code blocks
 */
export function CodeGroup({ children }: CodeGroupProps) {
  // CodeGroup is essentially a pass-through wrapper for code blocks
  // It can be styled differently if needed, but for now just renders children
  return (
    <div className="my-4">
      {children}
    </div>
  );
}

