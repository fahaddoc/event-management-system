import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import mongoose from 'mongoose'
import { dbConnect } from '../lib/db'
import { User } from '../lib/models/User'
import { Event } from '../lib/models/Event'
import { hashPassword } from '../lib/password'

async function main() {
  await dbConnect()

  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()
  let admin = await User.findOne({ email })
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email,
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD ?? 'admin12345'),
      role: 'admin',
    })
    console.log('Created admin user:', email)
  } else {
    console.log('Admin already exists:', email)
  }

  const count = await Event.countDocuments()
  if (count === 0) {
    await Event.create([
      {
        title: 'Tech Conference',
        description: 'Annual technology conference with talks and workshops.',
        category: 'Technology',
        date: new Date(Date.now() + 6e8),
        time: '09:00',
        venue: 'Convention Center',
        city: 'New York',
        capacity: 120,
        price: 0,
        status: 'published',
        isFeatured: true,
        organizer: admin._id,
      },
      {
        title: 'Music Festival',
        description: 'A day of live music across three stages.',
        category: 'Music',
        date: new Date(Date.now() + 12e8),
        time: '18:00',
        venue: 'Open Grounds',
        city: 'London',
        capacity: 80,
        price: 25,
        status: 'published',
        organizer: admin._id,
      },
    ])
    console.log('Seeded 2 sample events.')
  } else {
    console.log(`Events already present (${count}); skipping sample events.`)
  }

  console.log('Seed complete.')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
