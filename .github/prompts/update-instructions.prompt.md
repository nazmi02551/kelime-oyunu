# Update Copilot Instructions Prompt

Analyze the recent changes in this workspace and update `.github/copilot-instructions.md` accordingly.

## What to Check:

### New Files/Folders
- List new directories in `/backend` or `/frontend/src`
- Check for new model files in `/backend/models`
- Check for new routes in `/backend/routes`
- Check for new screens in `/frontend/src/screens`
- Check for new services in `/frontend/src/services`

### New Dependencies
- Check `requirements.txt` for new Python packages
- Check `package.json` for new npm packages

### New Patterns
- New UI component patterns (gradient, animations)
- New API patterns (authentication, error handling)
- New WebSocket events

### Configuration Changes
- Environment variable changes (`.env`, `config.py`, `env.js`)
- Port changes, URL changes
- New CORS origins

## Update Instructions:

1. **IF** new major folder/service added → Update "Mimari ve Yapı" section
2. **IF** new technology added → Update "Teknoloji Stack" section
3. **IF** new code pattern → Update "Best Practices" section
4. **IF** new common issue → Update "Common Issues" section
5. **IF** new environment config → Update "Environment & Config" section

## Output Format:

```markdown
### Changelog Entry

#### [Date] - v[Version]
- Added: [New features]
- Changed: [Modifications]
- Fixed: [Bug fixes]
```

## Guidelines:

- Keep high-level, avoid implementation details
- Focus on patterns, not specific lines of code
- Maintain consistent formatting
- Keep changelog at the bottom of instructions file
- Don't remove existing content, only add/update

## Example Changes:

```diff
### Backend (`/backend/`)
```
backend/
├── app.py
├── models/
│   ├── user.py
│   ├── friendship.py
+│   ├── video_call.py    # NEW
│   └── ...
├── routes/
│   ├── auth.py
+│   ├── video.py         # NEW
```
```

---

**Usage:** Run this prompt monthly or after major changes to keep instructions synchronized with codebase.
