import { Schema, model } from 'mongoose';

export interface IUser {
  _id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const User = model<IUser>('User', userSchema);
