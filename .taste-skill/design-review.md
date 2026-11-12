# Kurikira landing page review

Audience: creators and businesses with Instagram professional accounts. Primary action: open the workspace and get started free.

Inventory: Kurikira speech-arrow logo; navy ink; orange action; NGOGA Digitals; Instagram professional accounts; Reel selection; whole-word keyword matching; a user-written private reply; destination link; delivered/rejected/uncertain activity; free current features; email-draft support.

Argument: demonstrate a keyword turning a comment into a private reply; explain the real setup; show campaign controls; state the current free offer; answer account/delivery questions; offer support.

Direction: The product performs, seed 1724747377. Existing palette and Manrope/DM Sans retained. No randomized redraws. Blueprint adaptations: one free offer instead of invented plan tiers; native disclosure FAQ for reliable keyboard access; existing support form retained because it gathers details for a real email draft. No new stock imagery or generated assets.

Idea: On this page, Kurikira’s chosen Reel, keyword and private reply become a working handoff visitors can try themselves. This is specific to the current feature set, though the interaction is shared by other comment automation products; originality should not be overstated.

Copy deck: They comment. You connect. / Automatically send a private Instagram reply with your link when someone comments your keyword on a Reel. / Your Reel. Your reply. / Less copying. More control. / Start with one Reel. / Before you begin. / We’re here to help. Primary CTA: Get started free.

## Initial audit
The product proof was below a full-height lifestyle hero. Mobile account eligibility overlaid the photograph. Feature heading occupied three lines. White CTA text on orange and small secondary text weakened readability. Hero, demo, process, pricing and support were all oversized, making the page approximately 7.4 desktop screens. CSS contained several competing overrides, floating glass navigation, and inconsistent text sizes.

## Round 1
Seen in one second: a large headline and a working keyword demo.
Live thing: editable keyword/comment; boundary-aware match states; no message sent.
Layouts: hero=interactive split / setup=photo and sequence / features=annotated campaign / pricing=offer split / FAQ=disclosures / contact=form.
Scores: design 7.5 · usability 8 · creativity 6.5 · content 8 → raw overall 7.5.
Caps applied: initial post-change inspector had picture/motion heuristic failures, so gated score capped at 6 pending fixes.
Top three: delivery tracking lacked a visible example (added an explicitly labeled activity fragment); scroll animations were too brief for inspector sampling (changed to observable CSS entrances); pricing CTA looked like a label above Free on mobile (moved to the offer panel).

## Assets and truthfulness
Reused public/creator-studio.jpg and public/creator-reel.jpg. Their provenance was not provided in the repository; no claim that they depict actual customers. No external assets added. The campaign name, lookbook link, Reel caption, and delivery activity are clearly marked examples, not real customer results. The website preview simulates keyword matching locally; it does not prove backend delivery. Existing price and account requirements retained. No testimonials or usage metrics invented. No relevant product footage was supplied, so motion uses interface entrances and a subtle photo drift.

## Validation
Production TypeScript/Vite build passed. Browser checks passed: case-insensitive matches; punctuation boundaries; non-match for hyperlink; empty input; escaped special-character keyword; no horizontal overflow at 320/390/768/1440; anchor destinations; native FAQ toggle; /app, /privacy, /terms rendering; no uncaught JS errors. Support still opens an email draft and does not submit to a server. Backend messaging was outside this visual redesign and was not exercised.

## Final visual review
Seen in one second: headline plus editable comment-to-reply proof.
Idea and live interaction: unchanged; the demo is the primary visual proof.
Scores: design 7.5 · usability 8 · creativity 6.5 · content 8 → overall 7.5/10 (subjective design review, not user research).
Final inspector: zero failures at 1440, 768 and 390px. All headings fit two lines. Remaining warnings: limited large photography and no video. Deliberate choice: existing creator imagery provides context while readable interactive fragments explain the software; unrelated footage would add distraction and weight. Source lint warnings concern legitimate input borders, not decorative card outlines.
Remaining limitations: shared category concept; the long support form could be moved to a dedicated page in a future information-architecture change; existing photo provenance should be confirmed before publication. Final build passed. No deployment performed.
