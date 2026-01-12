declare module 'turndown-plugin-gfm' {
  import TurndownService from 'turndown';
  
  /**
   * GitHub Flavored Markdown plugin for Turndown.
   * Adds support for tables, strikethrough, task lists, and autolinks.
   */
  export function gfm(turndownService: TurndownService): void;
  
  /**
   * Individual plugins that can be used separately
   */
  export function tables(turndownService: TurndownService): void;
  export function strikethrough(turndownService: TurndownService): void;
  export function taskListItems(turndownService: TurndownService): void;
  export function autolink(turndownService: TurndownService): void;
}
