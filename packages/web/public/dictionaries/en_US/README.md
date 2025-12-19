# Dictionary Files

This directory should contain English (US) dictionary files for spellchecking:

- `en_US.aff` - Affix file (~50KB)
- `en_US.dic` - Dictionary file (~2-3MB)

## Obtaining Dictionary Files

You can obtain these files from:

1. **LibreOffice dictionaries** (recommended):
   - Download from: https://github.com/LibreOffice/dictionaries
   - Extract `en_US.aff` and `en_US.dic` from the `en` folder
   - Place both files in this directory

2. **wooorm/dictionaries**:
   - Download from: https://github.com/wooorm/dictionaries
   - Navigate to `dictionaries/en-US/index.dic` and `dictionaries/en-US/index.aff`
   - Rename to `en_US.dic` and `en_US.aff` respectively

3. **Hunspell dictionaries**:
   - Download from: https://github.com/hunspell/hunspell
   - Or use any Hunspell-compatible dictionary

## File Format

Both files should be UTF-8 encoded text files:
- `.aff` file contains affix rules
- `.dic` file contains word list

The spellchecker will automatically load these files when spellcheck is first enabled.

