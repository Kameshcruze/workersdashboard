# Google Sheets Backend Setup

Use this once for the Veliksha/Virukshaa dashboard.

1. Create a new Google Sheet.
2. In the sheet, open `Extensions` > `Apps Script`.
3. Replace the default code with the contents of `Code.gs`.
4. Click `Save`.
5. Click `Deploy` > `New deployment`.
6. Choose type `Web app`.
7. Set `Execute as` to `Me`.
8. Set `Who has access` to the people who should use the dashboard. For the simplest client setup, choose `Anyone with the link`.
9. Click `Deploy`, authorize the script, and copy the Web app URL ending in `/exec`.
10. Open `index.html`, paste that URL into the `Google Sheets Backend` field, and click `Connect`.

If you later change `Code.gs`, open `Deploy` > `Manage deployments`, edit the deployment, choose a new version, and deploy again. The dashboard should keep using the same `/exec` URL.

The script creates two tabs automatically:

- `Workers`: one row per worker.
- `Entries`: one row per worker/date shift entry.

After it is connected, the dashboard saves worker data to Google Sheets instead of browser local storage.
