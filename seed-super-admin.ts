import { db } from './src/lib/db'
import { hashPassword } from './src/lib/auth'

async function seedSuperAdmin() {
  const email = 'shizan.khan.wtc@gmail.com'
  const password = 'admin123@'
  const name = 'Shizan Khan'

  // Check if already exists
  const existing = await db.authUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`✅ User already exists: ${email} (ID: ${existing.id}, role: ${existing.role})`)
    // Update role to super_admin if not already
    if (existing.role !== 'super_admin') {
      await db.authUser.update({
        where: { id: existing.id },
        data: { role: 'super_admin' },
      })
      console.log(`🔐 Role updated to super_admin`)
    }
    // Update password
    const hashed = await hashPassword(password)
    await db.authUser.update({
      where: { id: existing.id },
      data: { password: hashed },
    })
    console.log(`🔑 Password updated`)
    await db.$disconnect()
    return
  }

  // Create super admin
  const hashedPassword = await hashPassword(password)
  const user = await db.authUser.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'super_admin',
      emailVerified: true,
    },
  })

  console.log(`👤 Super Admin created: ${email} (ID: ${user.id})`)

  // Seed default settings
  const settings = [
    { key: 'currency', value: 'INR' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'notify_new_order', value: 'true' },
    { key: 'notify_low_stock', value: 'true' },
    { key: 'notify_status_change', value: 'false' },
  ]
  for (const s of settings) {
    await db.userSettings.upsert({
      where: { userId_key: { userId: user.id, key: s.key } },
      update: {},
      create: { userId: user.id, key: s.key, value: s.value },
    })
  }

  console.log(`⚙️ Default settings seeded`)
  await db.$disconnect()
}

seedSuperAdmin().catch((e) => {
  console.error('Seed error:', e)
  process.exit(1)
})
