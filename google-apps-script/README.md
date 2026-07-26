# Drift Google Drive bridge

This Google Apps Script web app lets the static planner save and open JSON plans in the shared `Drift-shared` folder.

## Current deployment

- Script project ID: `1pne9g-fjZEn34XkaBLrH-ljPG95z8YWeAvHZOzb30JgKfOAHfTRy5Ek3`
- Deployment ID: `AKfycbyciIfqxb73y-jLS673UiLS0JMikfpjIkCRd9CbstrzfsHvgT1_LsI03tq6rfGK67zB`
- Web app URL: <https://script.google.com/macros/s/AKfycbyciIfqxb73y-jLS673UiLS0JMikfpjIkCRd9CbstrzfsHvgT1_LsI03tq6rfGK67zB/exec>
- Shared Drive folder: <https://drive.google.com/drive/folders/1Pb9k399mOkWK0h4z58DwKvBZANy9Wdoi>

The production planner already contains this web app URL, so travellers do not need to configure the bridge themselves.

## One-time deployment

1. Open <https://script.google.com/home/start> while signed into the Google account that owns `Drift-shared`.
2. Create a **New project** named `Drift holiday planner bridge`.
3. Replace the contents of `Code.gs` with the repository's `Code.gs` file.
4. In **Project Settings**, enable **Show appsscript.json manifest file in editor**. Replace that manifest with this folder's `appsscript.json`.
5. Click **Deploy → New deployment → Web app**.
6. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Deploy and approve the Drive permission.
7. Copy the deployed URL ending in `/exec` into the planner's **Export / Import → Connect Drive** field.

The bridge only lists, reads, creates and updates `.json` files directly inside folder `1Pb9k399mOkWK0h4z58DwKvBZANy9Wdoi`. It does not expose delete operations.

After changing `Code.gs`, create a new deployment version or edit the existing deployment to use a new version.

## Maintaining the existing project with clasp

From this folder, after signing in with `npx @google/clasp login`:

```powershell
npx --yes @google/clasp push --force
npx --yes @google/clasp create-version "Describe the bridge change"
npx --yes @google/clasp deploy --deploymentId AKfycbyciIfqxb73y-jLS673UiLS0JMikfpjIkCRd9CbstrzfsHvgT1_LsI03tq6rfGK67zB --description "Describe the bridge change"
```

The OAuth credentials created by clasp remain in the user's profile and must never be committed to this repository.
