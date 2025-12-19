/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// CSpell dictionary text file imports with ?raw suffix
declare module '@cspell/dict-software-terms/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-fullstack/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-aws/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-google/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-k8s/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-companies/dict/*.txt?raw' {
  const content: string;
  export default content;
}

declare module '@cspell/dict-gaming-terms/dict/*.txt?raw' {
  const content: string;
  export default content;
}

// CSpell gzipped dictionary file imports with ?url suffix
declare module '@cspell/dict-filetypes/*.txt.gz?url' {
  const url: string;
  export default url;
}

declare module '@cspell/dict-markdown/*.txt.gz?url' {
  const url: string;
  export default url;
}
