export { Callout } from './Callout';
export { Tabs, Tab } from './Tabs';
export { Accordion } from './Accordion';
export { CodeBlock } from './CodeBlock';
export { CodeGroup } from './CodeGroup';
export { Steps, Step } from './Steps';
export { Card } from './Card';
export { Badge } from './Badge';
export { Frame } from './Frame';
export { Tooltip } from './Tooltip';
export { Mermaid } from './Mermaid';
export { Math } from './Math';
export { Video } from './Video';
export { Image } from './Image';
export { Table } from './Table';
export { Chart } from './Chart';

// Import components for mdxComponents object (re-exports don't create local bindings)
import { Callout } from './Callout';
import { Tabs, Tab } from './Tabs';
import type { ComponentProps } from 'react';
import { Accordion } from './Accordion';
import { CodeBlock } from './CodeBlock';
import { CodeGroup } from './CodeGroup';
import { Steps, Step } from './Steps';
import { Card } from './Card';
import { Badge } from './Badge';
import { Frame } from './Frame';
import { Tooltip } from './Tooltip';
import { Mermaid } from './Mermaid';
import { Math } from './Math';
import { Video } from './Video';
import { Image } from './Image';
import { Table } from './Table';
import { Chart } from './Chart';

// Helper components for Callout aliases
type CalloutProps = ComponentProps<typeof Callout>;
const Note = (props: CalloutProps) => <Callout type="info" {...props} />;
const Tip = (props: CalloutProps) => <Callout type="success" {...props} />;
const Warning = (props: CalloutProps) => <Callout type="warning" {...props} />;

export const mdxComponents = {
  Callout,
  Note,        // Alias for Callout type="info"
  Tip,         // Alias for Callout type="success"
  Warning,     // Alias for Callout type="warning"
  Tabs,
  Tab,
  Accordion,
  AccordionGroup: Accordion, // Alias for AccordionGroup
  CodeBlock,
  CodeGroup,
  Steps,
  Step,
  Card,
  Badge,
  Frame,
  Tooltip,
  Mermaid,
  Math,
  Video,
  Image,
  Table,
  Chart,
};
