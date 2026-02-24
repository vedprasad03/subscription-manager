# .gitignore Pattern Reference

Use this file when creating or updating a .gitignore. Copy the template at the
bottom as a starting base, then add project-specific patterns above the final
section.

---

## Pattern Syntax Cheatsheet

| Pattern | Meaning |
|---|---|
| `filename.ext` | Ignore this file anywhere in the repo |
| `*.ext` | Ignore all files with this extension |
| `dirname/` | Ignore this directory (trailing slash = dir only) |
| `/filename` | Ignore only at repo root |
| `**/dirname/` | Ignore directory at any depth |
| `!pattern` | Un-ignore (negate a previous rule) |
| `#comment` | Comment line |

---

## Pattern Library by Category

### Dependencies
```
# Dependencies
node_modules/
.pnp/
.pnp.js
vendor/
```

### Build & Dist Outputs
```
# Build outputs
dist/
build/
out/
.next/
.nuxt/
.vite/
.svelte-kit/
.output/
*.tsbuildinfo
```

### Environment & Secrets
```
# Environment & secrets — NEVER commit these
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
secrets/
credentials/
service-account*.json
```

Note: `.env.example` (a template with no real values) is typically safe to
commit and is negated above. Confirm with the user if unsure.

### IDE & Editor Settings
```
# IDE / editor
.vscode/
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.vim/
*.code-workspace
```

Note: `.vscode/extensions.json` is often useful to share with collaborators.
The negation above preserves it. Adjust if the project is truly solo.

### OS-Generated Files
```
# OS generated
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini
$RECYCLE.BIN/
```

### Logs
```
# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

### Runtime & Cache
```
# Cache & runtime
.cache/
.parcel-cache/
.eslintcache
.stylelintcache
*.pid
*.pid.lock
.node_repl_history
```

### Python-Specific
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg
*.egg-info/
dist/
.eggs/
.Python
pip-wheel-metadata/
.venv/
venv/
ENV/
.mypy_cache/
.dmypy.json
dmypy.json
.pytest_cache/
.ruff_cache/
```

### Testing & Coverage
```
# Test & coverage
coverage/
.nyc_output/
*.lcov
.coverage
htmlcov/
.tox/
```

### Miscellaneous
```
# Misc
*.zip
*.tar.gz
*.bak
*.orig
TODO.local.md
```

---

## Base Template

Use this as the starting point when creating a new .gitignore. Remove sections
not relevant to the project's stack.

```gitignore
# =============================================================
# .gitignore — <Project Name>
# =============================================================

# Dependencies
node_modules/
.pnp/
.pnp.js

# Build outputs
dist/
build/
out/
.next/
.nuxt/
*.tsbuildinfo

# Environment & secrets — NEVER commit these
.env
.env.*
!.env.example
*.pem
*.key
secrets/

# IDE / editor
.vscode/
!.vscode/extensions.json
.idea/
*.suo
*.sw?

# OS generated
.DS_Store
._*
Thumbs.db
desktop.ini

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*

# Cache & runtime
.cache/
.parcel-cache/
.eslintcache

# Test & coverage
coverage/
.nyc_output/

# =============================================================
# Project-specific
# =============================================================
# Add patterns here that are unique to this project

```

---

## Notes on Lock Files

Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`)
are a judgment call:

- **Solo project, no CI:** Either way is fine, but tracking them ensures
  reproducible installs.
- **Team / production project:** Almost always track lock files.
- **Library being published as npm package:** Often excluded (`package-lock.json`
  only; `yarn.lock` usually tracked).

**Default recommendation:** Track lock files. Ask the user if they prefer
otherwise.
