import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const RegistrationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
})
RegistrationSchema.index({ user: 1, event: 1 }, { unique: true })

export type RegistrationDoc = InferSchemaType<typeof RegistrationSchema> & { _id: string }
export const Registration: Model<RegistrationDoc> =
  (models.Registration as Model<RegistrationDoc>) ||
  model<RegistrationDoc>('Registration', RegistrationSchema)
