---
name: plan-handoff
description: >
  Enhances an existing planning mode for a model handoff between planning and
  execution. Use this skill when one planning model creates a plan and another,
  potentially smaller model implements it afterward.
---

# Plan Handoff

## Core Principle

The existing planning mode remains unchanged:

1. The user describes the goal.
2. The planning model analyzes it, asks follow-up questions, and creates a plan.
3. The user ends the planning phase.
4. Another model executes the plan.

This skill neither replaces planning mode nor follow-up questions. It only
ensures that the final plan is a complete, reliable handoff for the execution
model.

## During Planning

Behave as the normal planning mode would.

In addition, ensure that the final plan explicitly includes:

- Goal and expected outcome
- Clear scope and important exclusions
- Relevant files, modules, or areas
- Concrete, ordered implementation steps
- Important technical decisions and constraints
- Assumptions, risks, and open questions
- Acceptance criteria
- Tests or other validation steps

Keep the plan concise. Document only information that is relevant to a correct
implementation or a safe model handoff.

If essential information is missing, ask follow-up questions as usual. Do not
invent requirements or architectural decisions.

## Handoff Rule

When the final plan is presented, it must be executable without additional,
implicit information.

The plan must end with this short section:

```text
## Handoff to Execution

- Follow this plan and stay within its defined scope.
- Do not make new material assumptions.
- Ask before deviating from technical decisions, scope, the defined goal, or
  acceptance criteria.
- Run the listed tests and validation steps.
- Clearly report failed checks, plan deviations, or unresolved ambiguities.
