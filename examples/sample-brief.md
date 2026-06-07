# Sample brief

This is the intended shape of the Octavus worker output. The exact text depends on the issue, comments, repo contents, and model.

## TL;DR
A maintainer gets the actionable path in the first few lines instead of digging through the full issue thread.

## Facts from the issue
- Pulls concrete title, labels, body details, and recent comments.
- Calls out what is missing instead of fabricating repo facts.

## Likely code areas
- Based on targeted `search-repo-code` snippets when the issue mentions symbols, filenames, or UI copy.

## Suggested implementation plan
1. Reproduce with a small regression test.
2. Patch the narrowest module that owns the behavior.
3. Keep behavior outside the issue scope unchanged.

## Tests to run
- Unit or integration test near the changed module.
- Manual reproduction command from the issue, if present.

## Maintainer reply draft
Thanks for the report. I found the likely code path and will validate with a regression test before changing it.
