// Read-only: the E2E test user's row + its ai_usage. Prints no secrets.
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const u = await sql`SELECT id, plan, stripe_customer_id IS NOT NULL AS has_customer, stripe_subscription_id
    FROM users WHERE email = 'kpaulikas21+grimoire-e2e@gmail.com'`;
  const usage = u.length ? await sql`SELECT model, count(*)::int AS calls, sum(prompt_tokens)::int AS pin,
    sum(completion_tokens)::int AS pout, round(avg(duration_ms))::int AS avg_ms FROM ai_usage WHERE user_id = ${u[0].id} GROUP BY 1` : [];
  console.log(JSON.stringify({ user: u, usage }, null, 1));
})().catch((e) => { console.error('probe failed:', e.message); process.exit(1); });
