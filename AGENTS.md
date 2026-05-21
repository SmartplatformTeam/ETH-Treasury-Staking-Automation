# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Phase Documentation Convention

**Every phase done = three files touched.**

When a phase reaches its "done" condition:

1. **`docs/work-log/<date>-phase<N>-done.md`** — internal details (schema, files changed, verification scenarios, follow-ups). Already the existing pattern.
2. **`docs/CHANGELOG.md`** — append one paragraph at the top (operator-facing summary, new endpoints/env/pages, link to done doc).
3. **`docs/operator-runbook.md`** — update only if user-facing behavior changed (new page, new flow, new troubleshooting case, new known pattern).
4. **`docs/SESSION-HANDOFF.md`** — refresh "last updated" + §1 한 줄 상태 + §3 배포 commit + §5 phase 표에 한 줄 추가. follow-up 항목 변동 있으면 §7 도. 새 세션이 이 문서로 컨텍스트 복원하므로 항상 최신 유지.

Skipping (1) is forbidden — work-log is the audit trail.
Skipping (2) is forbidden — CHANGELOG is the changelog source of truth.
Skipping (3) is allowed only if the change is purely internal (no operator/admin behavior change).

Also: when fixing a recurring pattern (e.g. the NestJS DI bug, the `'use server'` export rule), add it as a numbered entry in [docs/operator-runbook.md §8](docs/operator-runbook.md#8-알려진-함정--코드-패턴) so the next contributor doesn't repeat it.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.