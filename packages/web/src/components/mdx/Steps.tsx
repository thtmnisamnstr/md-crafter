import { ReactNode, Children, isValidElement } from 'react';

interface StepsProps {
  children: ReactNode;
}

interface StepProps {
  title?: string;
  children: ReactNode;
}

export function Steps({ children }: StepsProps) {
  const childArray = Children.toArray(children).filter(isValidElement);

  return (
    <div className="my-4 pl-8 border-l-2 border-editor-accent">
      {childArray.map((child, index) => (
        <div key={index} className="relative pb-6 last:pb-0">
          <div
            className="absolute -left-[33px] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'var(--editor-accent)',
              color: 'white',
            }}
          >
            {index + 1}
          </div>
          <div className="pl-4">{child}</div>
        </div>
      ))}
    </div>
  );
}

export function Step({ title, children }: StepProps) {
  return (
    <div>
      {title && (
        <h4
          className="font-semibold mb-2"
          style={{ color: 'var(--editor-fg)' }}
        >
          {title}
        </h4>
      )}
      <div className="text-sm" style={{ color: 'var(--editor-fg)', opacity: 0.8 }}>
        {children}
      </div>
    </div>
  );
}

