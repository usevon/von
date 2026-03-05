# @usevon/email

Transactional email templates for Von, built with React Email.

## Usage

```typescript
import { render, WelcomeEmail } from "@usevon/email"

const html = await render(
  WelcomeEmail({ name: "Kyle", dashboardUrl: "https://app.usevon.com" })
)
```

## Templates

- WelcomeEmail
- PasswordResetEmail
- InvitationEmail
- FailureAlertEmail
- EndpointRecoveredEmail
- EmailChangedEmail
- PlanChangedEmail
- QuotaWarningEmail

## Development

Start the React Email preview server:

```bash
bun dev
```

Opens at `http://localhost:3002` with live preview of all templates.

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
