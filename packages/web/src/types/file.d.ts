/**
 * Extended File interface for webkitRelativePath support
 * 
 * Some browsers and file input APIs provide webkitRelativePath
 * for directory uploads. This extends the standard File interface.
 */

export interface FileWithWebkitPath extends File {
  webkitRelativePath?: string;
}

