# MDX Support in md-crafter

md-crafter supports MDX (Markdown + JSX) with built-in interactive components, user-defined component libraries, import resolution, and MDX-aware export workflows.

## MDX Pipeline

The MDX runtime now uses a dedicated engine with:

- GFM support (tables, task lists, strikethrough)
- Math syntax (`$...$`, `$$...$$`) via KaTeX
- Heading IDs for generated HTML anchors
- Mermaid fence support (` ```mermaid `)
- MDX import parsing + resolver-backed component loading

Preview and export both use the same MDX engine.

## Built-in Components

Built-ins are available without imports.

### Existing UI components

- `<Callout>`
- `<Tabs>` / `<Tab>`
- `<Accordion>`
- `<CodeBlock>`
- `<CodeGroup>`
- `<Steps>` / `<Step>`
- `<Card>`
- `<Badge>`
- `<Frame>`
- `<Tooltip>`

Aliases:

- `<Note>` -> info callout
- `<Tip>` -> success callout
- `<Warning>` -> warning callout

### New v0.2.2 built-ins

#### `<Mermaid>`

```mdx
<Mermaid chart={`graph TD\n  A[Start] --> B[Done]`} />
```

Or markdown fence:

````md
```mermaid
graph TD
  A --> B
```
````

#### `<Math>`

```mdx
<Math value="E = mc^2" inline />

<Math value={`\\int_0^1 x^2 \\; dx = 1/3`} />
```

Math markdown is also supported:

```md
Inline: $E = mc^2$

$$
\\int_0^1 x^2 \\; dx = 1/3
$$
```

#### `<Video>`

```mdx
<Video src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Demo" />
<Video src="https://vimeo.com/76979871" />
<Video src="https://example.com/video.mp4" controls />
```

#### `<Image>`

```mdx
<Image src="https://example.com/diagram.png" alt="Architecture" caption="System Overview" />
```

Includes lightbox/open-close behavior with keyboard accessibility in preview.

#### `<Table>`

```mdx
<Table
  columns={["name", "status"]}
  rows={[
    { name: "Service A", status: "Healthy" },
    { name: "Service B", status: "Degraded" }
  ]}
  sortable
  filterable
/>
```

Standard markdown tables remain supported as normal markdown.

#### `<Chart>`

```mdx
<Chart
  type="line"
  data={{
    labels: ["Jan", "Feb", "Mar"],
    datasets: [{ label: "Requests", data: [12, 19, 9] }]
  }}
/>
```

Supports common chart types (`line`, `bar`, `pie`, `doughnut`, `area`).

## User Component Library

Open **View -> MDX Component Library** (or command palette) to manage components.

The library supports:

- Create/edit/duplicate/delete component definitions
- Enable/disable per component
- Live preview while editing
- Per-component docs + example blocks
- Props documentation table (manual + auto-fill when doc metadata exists)

### Source types

Each component can be defined from:

- **Inline** source module
- **npm** package (via ESM CDN resolution)
- **GitHub** source (repo/ref/file via ESM CDN path)
- **Local file** (relative or absolute path)

Definition model fields include:

- `id`, `name`, `sourceType`, `source`, `exportName`
- `versionOrRef`, `enabled`, `docs`
- `propsSchema`, `propDocs`, `example`

## Import Resolution and Path Semantics

Document-level MDX imports are supported and merged with built-ins + library components at runtime.

Resolution order in runtime component map:

1. Built-ins
2. Enabled component library entries
3. Document imports

Local-path semantics are consistent across desktop and web:

- Relative imports resolve from the current document path
- Absolute imports resolve against workspace roots
- Desktop additionally accepts native OS absolute paths
- Web uses File System Access workspace roots for local file loading

## Export and Transform

### Static HTML export (MDX-aware)

- Renders MDX to static HTML with embedded styles
- Includes KaTeX-compatible styling
- Preserves heading IDs from the MDX pipeline

### Markdown export modes

- **Markdown**: raw source
- **Markdown (strip MDX)**: converts/removes MDX syntax

Strip-MDX transform behavior:

- Converts supported built-ins to markdown equivalents where possible
- Removes `import`/`export` MDX ESM blocks
- Preserves content for unknown components as plain markdown content

### Batch export

Batch export supports open tabs and selected cloud docs, packaged as ZIP.

### In-editor strip action

Use **Edit -> Strip MDX to Markdown** to rewrite the active document content in-place.

## Notes

- Trusted workspace code execution is enabled for local component modules.
- Preview responsiveness is improved using compile/runtime/component-map caches keyed by document/component state.
