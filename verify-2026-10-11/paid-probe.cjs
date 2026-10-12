// Read-only: plan counts + 30-day AI usage. Prints counts only.
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const plans = await sql`SELECT plan, count(*)::int AS n FROM users GROUP BY plan ORDER BY n DESC`;
  const usage = await sql`SELECT coalesce(model,'?') AS model, count(*)::int AS calls,
    count(DISTINCT user_id)::int AS users, sum(prompt_tokens)::bigint AS pin, sum(completion_tokens)::bigint AS pout
    FROM ai_usage WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY calls DESC`;
  const subs = await sql`SELECT count(*)::int AS n FROM users WHERE stripe_subscription_id IS NOT NULL`;
  console.log(JSON.stringify({ plans, usage, withSubscriptionId: subs[0].n }, null, 1));
})().catch((e) => { console.error('probe failed:', e.message); process.exit(1); });
