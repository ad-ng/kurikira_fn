# Kurikira website and dashboard

React + TypeScript dashboard for the NGOGA Digitals Instagram comment-to-DM service. This frontend connects to the NestJS backend in `kurikira_bn`. It never receives the Meta app secret or Instagram access token.

The public landing page is at `/`, the workspace is at `/app`, and the privacy policy and terms are at `/privacy` and `/terms`. Public pages render without the backend. Configure the static host to serve `index.html` for these routes (SPA fallback). The support form opens a prefilled email draft to `info@ngogadigitals.com`; it does not submit to a server. Review the legal copy against the deployed backend's actual data retention and infrastructure before publishing.

## Local setup

1. In the backend repository, configure PostgreSQL, run `npm run db:push`, and start the backend with `npm run dev`.
2. In this repository, run:

   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. Open `http://localhost:5173` for the public site, then go to `/app` to register with an email address and a password of at least 12 characters. Connect an Instagram professional account through Meta. If Meta grants access but does not list the account, enter its numeric professional account ID from Meta's API setup in the dashboard. The backend verifies that the granted token can read that ID. Keep the backend running on `http://localhost:3000`.

The dashboard lists Reels from each connected account, lets users create, edit, pause, and delete campaigns with confirmation, configure an optional public comment reply after a successful DM, and shows recent comment results. `SENDING` and `UNCERTAIN` results are shown for manual review; the frontend does not retry them. Meta credentials stay on the backend.

Meta OAuth needs `META_APP_ID`, `META_LOGIN_CONFIG_ID`, `META_OAUTH_REDIRECT_URI`, and `TOKEN_ENCRYPTION_KEY` in the backend `.env`. Register the exact HTTPS callback URL in Meta's Unified Login setup. See the backend README for details.

## Deployment

Build with `npm run build` and serve `dist/` at `https://kurikira.ngogadigitals.com`. Set `VITE_API_BASE_URL=https://api.kurikira.ngogadigitals.com` at build time. Deploy the backend separately at that API origin, set `FRONTEND_ORIGIN=https://kurikira.ngogadigitals.com`, and use HTTPS so the admin session cookie is secure. Point Meta's webhook callback to `https://api.kurikira.ngogadigitals.com/webhooks/instagram` when that backend is live. Until then, the dev tunnel remains the webhook callback.

Shared inbox, DM keyword automation, password reset, and team roles remain future work.

## Admin and client access

Client users manage their own workspace. Administrators also see **Users & clients**, where they can add and edit users, change Client/Admin roles, reset passwords, and suspend/reactivate access. Role and access changes require confirmation. Suspending access signs the user out; it does not stop existing campaigns. Public signup always creates a Client account. Administrative permissions are enforced by the backend, not just by hiding navigation.

## Analytics and leads

**Analytics** shows matching comments, DMs accepted by Meta, public replies, tracked clicks, distinct leads, and manually marked customers. Filter by campaign and 7/30/90 days or all time; explore daily activity by mouse or keyboard. **View analytics** on a campaign opens its report. **Manage leads** and campaign lead counts open the corresponding lead list.

**Leads** captures contacts from matching comments, with campaign/stage filters, search, pagination, recent comment history, and editable name, email, phone, notes, and New/Contacted/Customer/Lost stages. Lead details can be bookmarked. Updates stay within the signed-in workspace. Existing identifiable matched contacts are imported by the backend schema update. Click tracking starts with newly sent messages; it cannot reconstruct old clicks. Configure the backend’s public API URL so tracked links are reachable from Instagram.

## Questionnaires in Instagram DMs

In a campaign, enable **Ask questions in Instagram DMs**. The property-viewing template covers budget, location, bedrooms and visit time; edit, reorder or add up to ten questions with text, number or multiple-choice answers. Use **Enable message replies** for that Instagram account, then save the campaign. New campaigns can be saved paused while setup is completed.

The opening DM includes the first question. Each recipient reply is saved to the lead before the next question is sent. The completion message includes the campaign link. Open a lead to view saved answers, progress, or stop the questionnaire. STOP/CANCEL replies also stop it. Existing sessions keep their original question order after edits. Instagram’s message webhook setup is required; live conversations should be tested from a second Instagram account before launch.
