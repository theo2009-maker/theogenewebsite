# TheogeneNiyonzima

Electronics marketplace for Rwanda, branded for TheogeneNiyonzima. Static Vite frontend, Netlify Functions, Netlify Identity, and Netlify Database with Drizzle ORM.

## Development

Install Node.js 22+, then run `npm install`, `netlify link`, and `netlify dev --port 8889`. Run `npm run check` for server type checking. Netlify builds with `npm run build` and publishes `dist`.

## Deployment and management

Database migrations in `netlify/database/migrations/` apply automatically on deployment. Do not manually apply them. For schema changes edit `db/schema.ts` and run `npx drizzle-kit generate --name describe_your_change`.

Identity must be enabled. Create/invite the owner through Netlify Identity and assign the `admin` role in the dashboard; sign out and back in afterward. Normal signup does not grant administrative access. Admins publish their own products immediately and approve other sellers’ submitted listings before publication. Use Owner / Admin for management and Add product to create a listing.

Read `/management.html` for the complete owner guide, payment workflow, and XAMPP explanation. Production uses managed PostgreSQL; XAMPP/MariaDB is not a backend for this edition.

Payments are manual direct MTN/Airtel transfers. Buyers reserve a single device, pay the seller through their mobile operator, and submit a transaction reference. Sellers/admins verify actual wallet receipt before marking an order paid. No automatic payment processing, escrow, refunds, shipment tracking, or provider integration is implemented.

Example catalog cards display only when there are no live listings or catalog retrieval fails. They are explicitly labeled illustrative and cannot be ordered. The site never seeds fake inventory or real seller payment details.
