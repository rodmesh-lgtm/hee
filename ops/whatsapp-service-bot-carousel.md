# WhatsApp service bot and product carousel

The bot is a tenant-scoped customer-service feature. Deployment creates no enabled bots and sends no messages. An authorized member must save approved facts/FAQ and explicitly enable a number. Existing outbound and operations gates remain in force.

## Configuration

- Rules mode requires at least one FAQ and does not call an AI provider.
- AI mode uses the existing OpenAI integration (`INFRO_OPENAI_API_KEY`, falling back to `OPENAI_API_KEY`). Set `INFRO_WHATSAPP_BOT_AI_ENABLED=true` and an explicit supported Responses API model in `INFRO_WHATSAPP_BOT_MODEL` only after reviewing the provider account. Keys are never sent to the browser.
- The AI request contains only the configured business knowledge, FAQs, and current question; `store:false`, strict JSON output and a 25-second timeout are enforced. No tools/actions or other conversation history are exposed. This is a business support assistant, not a general-purpose AI product.
- Daily reservations per number are capped at 1–100; previews are separately capped at 20 per tenant/day. Limits include failed/skipped reservations. A crashed generation is marked failed after five minutes and is not replayed.
- `whatsapp:replies` processes one bot reservation before draining the existing durable reply queue, both in the npm and Vercel runners. Numbers are selected by last processing time for fairness. SQL locks serialize budgets and the inbound message primary key prevents duplicate answers.

## Stop and handoff

Saving paused or changing settings invalidates old queued answers. The sending worker rechecks revision, enable state, assignment, newer conversation messages, other queued replies, opt-outs/deleted contacts, connection and the 24-hour service window. An already accepted Meta request cannot be recalled. Human replies create a sticky handoff; resuming applies only to future messages and never overrides employee assignment.

## Product cards

Create a MARKETING product carousel with two PRODUCT/SPM cards, wait for Meta approval, then select 2–10 retailer IDs in the campaign composer. The immutable snapshot stores native `carousel.cards[].components[].parameters[].product` data. Media carousels, card-level text variables and URL buttons remain unsupported and fail closed.

The catalog reader uses only the tenant connection's encrypted credential and the configured Graph version. It verifies the catalog is linked to that WABA and that selected products belong to it before snapshotting. It retrieves up to 500 products; the picker makes that bound explicit. Redirect URLs from provider paging responses are never followed. Images/prices are rendered by WhatsApp from the catalog, not fabricated in the INFRO preview.

Reference formats: Meta product-card carousel documentation (`https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/product-card-carousel-template-messages`); primary provider template documentation (`https://docs.360dialog.com/docs/resources/templates/product-card-carousel-templates`); product-header payload reference (`https://apidocs.qikberry.ai/whatsapp/template/components`). Real provider acceptance still depends on catalog permissions, supported Graph version, template approval and account eligibility.

## Release checks

- Additive migration `20261007130000_whatsapp_service_bot` introduces three tables; it changes no customer rows. Apply through the existing exact-SHA maintenance/backup/migration workflow, never from request handlers.
- `node --import tsx --test tests/whatsapp-bot-carousel.test.ts` validates FAQ normalization, handoff/output bounds and native product payloads.
- RC Quality runs `node --conditions=react-server --import tsx scripts/whatsapp-bot-carousel-audit.ts` against its isolated PostgreSQL database: real SQL with rollback, mocked external calls, tenant isolation, duplicate suppression, daily cap, pause, employee assignment, handoff, opt-out and catalog ownership.
- Visual audit exercises saving a paused bot, local FAQ preview, and Arabic mobile/desktop/light/dark bot/carousel pages. It never submits a Meta template or enables a bot.
