# SAT Reading and Writing Practice Test 2

Independent static test for GitHub Pages.

## Google Sheets connection

1. Open the Google Sheet.
2. Go to Extensions > Apps Script.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy the `/exec` URL.
8. Paste that URL into `app.js` in `CONFIG.scriptUrl`.

The script creates student-answer columns only: `M1_Q1` through `M1_Q27` and `M2_Q1` through `M2_Q27`. It does not create columns with correct answers.
