import { StateCreator } from 'zustand';
import { AppState, MdxComponentDefinition, WorkspaceRoot } from './types';

export interface MdxComponentsSlice {
  mdxComponentDefinitions: MdxComponentDefinition[];
  workspaceRoots: WorkspaceRoot[];
  activeWorkspaceRootId: string | null;
  addMdxComponentDefinition: (definition: Omit<MdxComponentDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMdxComponentDefinition: (id: string, updates: Partial<Omit<MdxComponentDefinition, 'id' | 'createdAt'>>) => void;
  removeMdxComponentDefinition: (id: string) => void;
  duplicateMdxComponentDefinition: (id: string) => void;
  toggleMdxComponentDefinitionEnabled: (id: string, enabled?: boolean) => void;
  addWorkspaceRoot: (root: Omit<WorkspaceRoot, 'id' | 'createdAt'>) => string;
  removeWorkspaceRoot: (id: string) => void;
  setActiveWorkspaceRootId: (id: string | null) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const createMdxComponentsSlice: StateCreator<AppState, [], [], MdxComponentsSlice> = (set, get) => ({
  mdxComponentDefinitions: [],
  workspaceRoots: [],
  activeWorkspaceRootId: null,

  addMdxComponentDefinition: (definition) => {
    const id = makeId('mdxcmp');
    const createdAt = Date.now();
    const nextDefinition: MdxComponentDefinition = {
      ...definition,
      id,
      createdAt,
      updatedAt: createdAt,
      enabled: definition.enabled ?? true,
    };

    set((state) => ({
      mdxComponentDefinitions: [...state.mdxComponentDefinitions, nextDefinition],
    }));

    return id;
  },

  updateMdxComponentDefinition: (id, updates) => {
    set((state) => ({
      mdxComponentDefinitions: state.mdxComponentDefinitions.map((definition) =>
        definition.id === id
          ? {
            ...definition,
            ...updates,
            updatedAt: Date.now(),
          }
          : definition
      ),
    }));
  },

  removeMdxComponentDefinition: (id) => {
    set((state) => ({
      mdxComponentDefinitions: state.mdxComponentDefinitions.filter((definition) => definition.id !== id),
    }));
  },

  duplicateMdxComponentDefinition: (id) => {
    const source = get().mdxComponentDefinitions.find((definition) => definition.id === id);
    if (!source) return;

    const duplicateId = makeId('mdxcmp');
    const now = Date.now();

    set((state) => ({
      mdxComponentDefinitions: [
        ...state.mdxComponentDefinitions,
        {
          ...source,
          id: duplicateId,
          name: `${source.name}Copy`,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
  },

  toggleMdxComponentDefinitionEnabled: (id, enabled) => {
    set((state) => ({
      mdxComponentDefinitions: state.mdxComponentDefinitions.map((definition) => {
        if (definition.id !== id) return definition;
        return {
          ...definition,
          enabled: typeof enabled === 'boolean' ? enabled : !definition.enabled,
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  addWorkspaceRoot: (root) => {
    const id = makeId('wsroot');
    const nextRoot: WorkspaceRoot = {
      ...root,
      id,
      createdAt: Date.now(),
    };

    set((state) => ({
      workspaceRoots: [...state.workspaceRoots, nextRoot],
      activeWorkspaceRootId: state.activeWorkspaceRootId || id,
    }));

    return id;
  },

  removeWorkspaceRoot: (id) => {
    set((state) => {
      const remaining = state.workspaceRoots.filter((root) => root.id !== id);
      return {
        workspaceRoots: remaining,
        activeWorkspaceRootId: state.activeWorkspaceRootId === id ? (remaining[0]?.id || null) : state.activeWorkspaceRootId,
      };
    });
  },

  setActiveWorkspaceRootId: (id) => {
    set({ activeWorkspaceRootId: id });
  },
});
