# gstack Skills Configuration
Use /browse from gstack for all web browsing. NEVER use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /plan-devex-review, /devex-review, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.

# Codex Desktop Windows stability
When emitting Codex Desktop git directives such as ::git-stage, ::git-commit, ::git-push, ::git-create-branch, or ::git-create-pr on Windows, always write cwd paths with forward slashes, for example cwd="D:/codeSpace/petMed". Never use backslashes in directive attributes.
Do not escape the quotes in directive attributes. Do not put raw git directive examples in final answers or code blocks unless the directive is meant to be executed by Codex Desktop.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match DESIGN.md.
