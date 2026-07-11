import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const EventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  city: { type: String, required: true, index: true },
  capacity: { type: Number, required: true, min: 1 },
  registeredCount: { type: Number, default: 0 },
  price: { type: Number, default: 0, min: 0 },
  isFeatured: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'published', 'rejected'],
    default: 'pending',
    index: true,
  },
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
})
EventSchema.index({ title: 'text', description: 'text' })

export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: string }
export const Event: Model<EventDoc> =
  (models.Event as Model<EventDoc>) || model<EventDoc>('Event', EventSchema)
