## Summary

<!-- One sentence: what does this PR do? -->

## Changes

<!-- List the files modified and why. -->

| File | Change |
|------|--------|
|  |  |

## Test plan

<!-- How did you verify this works? Include command output or test results. -->

```
npm test
# paste output here
```

## Quality gates

- [ ] All tests pass (`npm test`) — includes property-based + architecture fitness
- [ ] No mutation score regression (`npm run mutate:changed`)
- [ ] Security patterns reviewed (auth/crypto/payment changes → `/cso` ran)
- [ ] No debug statements (`console.log`, `debugger`) left in code
- [ ] No internal data, credentials, or personal paths exposed
- [ ] Commit message follows `[type]: summary` format with NOW/NEXT/BLOCK

## Methodology applied

<!-- Which signal/methodology was used? (optional) -->
<!-- e.g., Contract-First, TDD+Mutation, Strangler Fig, Property-Based -->
