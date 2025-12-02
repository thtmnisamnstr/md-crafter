export { Callout } from './Callout';
export { Tabs, Tab } from './Tabs';
export { Accordion } from './Accordion';
export { CodeBlock } from './CodeBlock';
export { Steps, Step } from './Steps';
export { Card } from './Card';
export { Badge } from './Badge';

// Re-export all components as a single object for MDX provider
import { Callout } from './Callout';
import { Tabs, Tab } from './Tabs';
import { Accordion } from './Accordion';
import { CodeBlock } from './CodeBlock';
import { Steps, Step } from './Steps';
import { Card } from './Card';
import { Badge } from './Badge';

export const mdxComponents = {
  Callout,
  Tabs,
  Tab,
  Accordion,
  CodeBlock,
  Steps,
  Step,
  Card,
  Badge,
};

