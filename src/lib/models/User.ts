import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
})

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string }
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>('User', UserSchema)
