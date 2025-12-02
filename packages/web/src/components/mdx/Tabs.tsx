import { useState, ReactNode, Children, isValidElement } from 'react';

interface TabsProps {
  items: string[];
  children: ReactNode;
}

interface TabProps {
  children: ReactNode;
}

export function Tabs({ items, children }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const childArray = Children.toArray(children).filter(isValidElement);

  return (
    <div className="my-4 border border-tab-border rounded-lg overflow-hidden">
      <div
        className="flex border-b border-tab-border"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeIndex === index
                ? 'border-b-2 border-editor-accent'
                : 'hover:bg-sidebar-hover'
            }`}
            style={{
              color: activeIndex === index ? 'var(--editor-accent)' : 'var(--editor-fg)',
              marginBottom: activeIndex === index ? '-1px' : '0',
            }}
            onClick={() => setActiveIndex(index)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4" style={{ background: 'var(--editor-bg)' }}>
        {childArray[activeIndex]}
      </div>
    </div>
  );
}

export function Tab({ children }: TabProps) {
  return <div>{children}</div>;
}

