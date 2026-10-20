# Cloud World — Phase 2 Project Marker Recommendation

## Inspected Data

### `worlds.data.ts` (lines 45–57)
```typescript
{
  id: 'cloud',
  name: 'Cloud / DevOps',
  heading: 'Cloud and DevOps Engineer',
  skillOrder: [
    'git',
    'docker',
    'health-checks',
    'compose',
    'ci-cd',
    'terraform',
    'ansible',
  ],
  projectOrder: ['rxverify', 'medigen', 'go-microservices'],
  optionalBranch: {
    skillId: 'kubernetes',
    afterSkillId: 'ansible',
  },
  palette: {
    background: '#1a0f08',
    accent: '#f97316',
    structure: '#7c2d12',
    highlight: '#fdba74',
  },
}
```

### `projects.data.ts` — Cloud-world projects (not in current file, but referenced by `projectOrder`)

The `projects.data.ts` I inspected contains **DATA world** projects only (4 projects). The Cloud World projects (`rxverify`, `medigen`, `go-microservices`) must be defined elsewhere or are not yet in the content model.

### Current `CloudWorld3D.tsx` (lines 93–118)
```typescript
const PROJECT_DATA = [
  { id: 'nifty100-financial-analysis', ... },  // DATA world
  { id: 'sql-data-warehouse', ... },           // DATA world
  { id: 'primetradeai', ... },                 // DATA world
  { id: 'data-analytics-dashboards', ... },    // DATA world
];
```
**Problem**: CloudWorld3D uses DATA world projects instead of Cloud World projects.

---

## Recommendation

### Use 3 Project Markers (matching `projectOrder` length = 3)

| Marker | Project ID | Source | Action Required |
|--------|------------|--------|-----------------|
| 1 | `rxverify` | Cloud World | Add to `projects.data.ts` or Cloud-specific content file |
| 2 | `medigen` | Cloud World | Add to `projects.data.ts` or Cloud-specific content file |
| 3 | `go-microservices` | Cloud World | Add to `projects.data.ts` or Cloud-specific content file |

### Do Not Use
- The 4 DATA world projects currently hardcoded in `CloudWorld3D.tsx`
- Any invented project data

### Implementation Approach

1. **Minimal change**: Create `src/content/projects.cloud.ts` with the three Cloud World projects (following the same schema as `projects.data.ts`)
2. **Import in `CloudWorld3D.tsx`**: Replace hardcoded `PROJECT_DATA` with imported cloud projects
3. **Preserve Data World**: Do not modify `projects.data.ts` or `src/content/index.ts` validation logic

### Visual Distinction (Per BluePrint)
- **Skill markers**: Cubes, blue (left) / red (right), scale 1.2, labels at y=5
- **Project markers**: Spheres, gold `#FFD700` → orange `#FF8C00` gradient, scale 1.5, labels at y=6, pulse on hover
- **Positions**: Distributed on landing platform at z=300: `[-8, 3, 300]`, `[0, 3, 308]`, `[8, 3, 300]`

---

## Verification

- [ ] `projectOrder` in `worlds.data.ts` has exactly 3 entries
- [ ] Cloud World projects defined with real GitHub URLs and verified tech stacks
- [ ] `CloudWorld3D.tsx` imports and uses cloud projects (not data projects)
- [ ] 3 markers render in Projects Sunset zone
- [ ] Markers visually distinct from skill markers
- [ ] Click → overlay shows correct project title, tech stack, GitHub link