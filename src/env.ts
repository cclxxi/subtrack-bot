import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  BOT_TOKEN: z.string().min(1),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  BOT_WEBHOOK_URL: z.string().url().optional(),
  BOT_WEBHOOK_SECRET: z.string().min(16).optional(),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_USERNAME: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SSL: z
    .string()
    .optional()
    .transform(v => v === 'true'),

  TZ_DEFAULT: z.string().default('Europe/Moscow'),
  DRIZZLE_OUT: z.string().default('./drizzle'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(z.treeifyError(parsed.error))
  process.exit(1)
}

export type Env = z.infer<typeof EnvSchema>
export const env: Env = parsed.data
