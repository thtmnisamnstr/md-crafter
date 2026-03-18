import { StateCreator } from 'zustand';
import { AppState, ImageAsset } from './types';
import { generateId } from './utils';

export interface ImageAssetsSlice {
  imageAssets: Record<string, ImageAsset>;
  upsertImageAsset: (asset: Omit<ImageAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) => string;
  renameImageAsset: (assetId: string, fileName: string) => void;
  removeImageAsset: (assetId: string) => void;
  getImageAssetDataUrl: (assetId: string) => string | null;
}

export const createImageAssetsSlice: StateCreator<AppState, [], [], ImageAssetsSlice> = (set, get) => ({
  imageAssets: {},

  upsertImageAsset: (asset) => {
    let resolvedId = asset.id || '';

    set((state) => {
      const existing = Object.values(state.imageAssets).find((entry) => entry.dataUrl === asset.dataUrl);
      if (existing) {
        resolvedId = existing.id;
        return state;
      }

      resolvedId = asset.id || `img-${Date.now().toString(36)}-${generateId()}`;
      const nextAsset: ImageAsset = {
        id: resolvedId,
        dataUrl: asset.dataUrl,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        sourceUrl: asset.sourceUrl,
        createdAt: asset.createdAt ?? Date.now(),
      };

      return {
        imageAssets: {
          ...state.imageAssets,
          [resolvedId]: nextAsset,
        },
      };
    });

    return resolvedId;
  },

  removeImageAsset: (assetId) => {
    set((state) => {
      if (!state.imageAssets[assetId]) return state;
      const next = { ...state.imageAssets };
      delete next[assetId];
      return { imageAssets: next };
    });
  },

  renameImageAsset: (assetId, fileName) => {
    const normalizedName = fileName.trim();
    if (!normalizedName) return;
    set((state) => {
      const existing = state.imageAssets[assetId];
      if (!existing) return state;
      return {
        imageAssets: {
          ...state.imageAssets,
          [assetId]: {
            ...existing,
            fileName: normalizedName,
          },
        },
      };
    });
  },

  getImageAssetDataUrl: (assetId) => {
    return get().imageAssets[assetId]?.dataUrl || null;
  },
});
