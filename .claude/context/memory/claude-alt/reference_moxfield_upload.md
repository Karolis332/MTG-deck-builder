---
name: reference-moxfield-upload
description: How to create private Moxfield decks via Playwright MCP — commander combobox (paste ignores *CMDR*), cookie overlay, deck URLs file
metadata:
  type: reference
---

Moxfield deck upload via the Playwright MCP browser (the operator logs in themselves; never type their password). Done 2026-10-07 for 7 paper decks; URLs + scripts in `verify-2026-10-07-moxfield/` (`decks.md`, `upload-<slug>.js`, run with `browser_run_code_unsafe` `filename`).

- Create dialog: Your Decks → "New Deck" → Name, Format (Commander / EDH default), **Commander combobox** (type the name, click `getByRole('option', {name, exact:true})`), "Advanced options" `<summary>` (retry until the Private radio is visible) → Visibility Private → Existing Deck List "Paste in List" → textarea → Create.
- The paste import **ignores `*CMDR*`**: the commander lands in the 99 and Moxfield warns "Commander-based deck without a Commander". Set it in the combobox and paste only the 99.
- A cookie-consent overlay (`#ncmp__tool`) intercepts clicks on Create → click via `evaluate(b => b.click())`; don't accept tracking for the operator.
- Bottom bar "N main deck" includes the commander (100 = 99 + commander).
- Operator's older Moxfield decks (Meren, Necrons, DnD Party, Palom, Bumi app test) were left untouched; new ones carry a "(paper)" suffix.
