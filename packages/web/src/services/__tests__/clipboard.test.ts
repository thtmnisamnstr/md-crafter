
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Basic mocks that don't depend on implementation details
vi.mock('turndown', () => ({
    default: vi.fn().mockImplementation(() => ({
        use: vi.fn(),
        turndown: vi.fn().mockReturnValue(''),
    })),
}));

vi.mock('turndown-plugin-gfm', () => ({
    gfm: vi.fn(),
}));

vi.mock('marked', () => ({
    marked: {
        parse: vi.fn().mockResolvedValue('<p>test</p>'),
    },
}));

vi.mock('@md-crafter/shared', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { copyAsHtml, pasteFromHtml } from '../clipboard';

describe('clipboard service', () => {
    beforeEach(() => {
        // Simple navigator mock
        const mockClipboard = {
            write: vi.fn().mockResolvedValue(undefined),
            writeText: vi.fn().mockResolvedValue(undefined),
            read: vi.fn().mockResolvedValue([]),
        };

        vi.stubGlobal('navigator', {
            clipboard: mockClipboard,
        });

        // Mock globally required objects
        vi.stubGlobal('ClipboardItem', vi.fn());
        vi.stubGlobal('Blob', vi.fn());

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('copyAsHtml should call clipboard write', async () => {
        await copyAsHtml('test');
        // It might call write or writeText depending on if ClipboardItem/Blob work
        expect(navigator.clipboard.write || navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('pasteFromHtml should call clipboard read', async () => {
        await pasteFromHtml();
        expect(navigator.clipboard.read).toHaveBeenCalled();
    });
});
