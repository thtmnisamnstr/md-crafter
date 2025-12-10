# MDX Support in md-crafter

md-crafter fully supports MDX (Markdown + JSX), allowing you to create interactive documents with React components.

## What is MDX?

MDX is a format that lets you seamlessly write JSX in your Markdown documents. It combines the simplicity of Markdown with the power of React components.

## Getting Started

Create a file with the `.mdx` extension and start writing:

```mdx
# Hello MDX

This is a **bold** statement with a React component:

<Callout type="info">
  This is an info callout!
</Callout>
```

## Built-in Components

md-crafter comes with a library of pre-built components you can use immediately:

### Callout

Display important information with styled callouts:

```mdx
<Callout type="info">
  This is informational content.
</Callout>

<Callout type="warning">
  Be careful with this operation!
</Callout>

<Callout type="error">
  Something went wrong.
</Callout>

<Callout type="success">
  Operation completed successfully!
</Callout>

<Callout type="info" title="Pro Tip">
  You can add a title to callouts.
</Callout>
```

**Props:**
- `type`: `"info"` | `"warning"` | `"error"` | `"success"` (default: `"info"`)
- `title`: Optional title string
- `children`: Content to display

### Tabs

Create tabbed content panels:

```mdx
<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tab>
    ```bash
    npm install md-crafter
    ```
  </Tab>
  <Tab>
    ```bash
    yarn add md-crafter
    ```
  </Tab>
  <Tab>
    ```bash
    pnpm add md-crafter
    ```
  </Tab>
</Tabs>
```

**Props:**
- `items`: Array of tab labels

### Accordion

Collapsible content sections:

```mdx
<Accordion title="Click to expand">
  This content is hidden by default.
</Accordion>

<Accordion title="Open by default" defaultOpen>
  This starts expanded.
</Accordion>
```

**Props:**
- `title`: The header text
- `defaultOpen`: Start expanded (default: `false`)
- `children`: Content to show when expanded

### CodeBlock

Syntax-highlighted code with copy button:

```mdx
<CodeBlock language="typescript" filename="example.ts">
const greeting = "Hello, MDX!";
console.log(greeting);
</CodeBlock>
```

**Props:**
- `language`: Programming language for highlighting
- `filename`: Optional filename to display
- `children`: The code content

### Steps

Numbered step-by-step instructions:

```mdx
<Steps>
  <Step title="Install dependencies">
    Run `npm install` to install all dependencies.
  </Step>
  <Step title="Configure settings">
    Create a `.env` file with your configuration.
  </Step>
  <Step title="Start the app">
    Run `npm run dev` to start development.
  </Step>
</Steps>
```

**Props:**
- `children`: `<Step>` components

**Step Props:**
- `title`: Optional step title
- `children`: Step content

### Card

Styled card containers with optional links:

```mdx
<Card title="Getting Started" href="/docs/getting-started">
  Learn how to set up md-crafter in your project.
</Card>

<Card title="API Reference" icon={<BookIcon />}>
  Complete API documentation.
</Card>
```

**Props:**
- `title`: Card title (required)
- `href`: Optional link URL
- `icon`: Optional React node for icon
- `children`: Card description

### Badge

Inline status badges:

```mdx
This feature is <Badge>New</Badge>

Status: <Badge variant="success">Active</Badge>

Warning: <Badge variant="warning">Deprecated</Badge>
```

**Props:**
- `variant`: `"default"` | `"success"` | `"warning"` | `"error"` | `"info"`
- `children`: Badge text

## Styling

Components automatically adapt to your current theme. The styles are:

- **Dark themes**: Components use darker backgrounds and lighter text
- **Light themes**: Components use lighter backgrounds and darker text
- **Accent colors**: Match your selected editor accent color

## Examples

### Documentation Page

```mdx
# API Reference

<Callout type="info">
  This API requires authentication. See the auth guide.
</Callout>

## Installation

<Tabs items={['npm', 'yarn']}>
  <Tab>npm install @md-crafter/client</Tab>
  <Tab>yarn add @md-crafter/client</Tab>
</Tabs>

## Quick Start

<Steps>
  <Step title="Import the client">
    Import the client in your code.
  </Step>
  <Step title="Initialize">
    Create a new instance with your API key.
  </Step>
</Steps>

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | <Badge variant="success">OK</Badge> | Request successful |
| 401 | <Badge variant="error">Error</Badge> | Unauthorized |
| 429 | <Badge variant="warning">Warning</Badge> | Rate limited |
```

### Tutorial Page

```mdx
# Building Your First App

<Card title="Prerequisites">
  Make sure you have Node.js 18+ installed.
</Card>

<Steps>
  <Step title="Create project">
    <CodeBlock language="bash">
    npx create-md-crafter-app my-app
    cd my-app
    </CodeBlock>
  </Step>
  <Step title="Start development">
    <CodeBlock language="bash">
    npm run dev
    </CodeBlock>
  </Step>
</Steps>

<Callout type="success" title="Done!">
  Your app is running at http://localhost:3000
</Callout>
```

## Limitations

- **No custom imports**: You cannot import external React components
- **No JavaScript execution**: Inline JS expressions are not evaluated
- **Static components**: Components are pre-defined in the editor

## Coming Soon

- Custom component definitions
- Live component preview
- Import from npm packages
- Export to static HTML with styles

