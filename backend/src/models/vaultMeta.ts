import { Schema, model, Types } from 'mongoose';

export interface IVaultMeta {
  _id: string;
  user_id: Types.ObjectId;
  has_backup: boolean;
  last_backup_at: Date | null;
  blob_path: string | null;
}

const vaultMetaSchema = new Schema<IVaultMeta>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  has_backup: { type: Boolean, default: false },
  last_backup_at: { type: Date, default: null },
  blob_path: { type: String, default: null },
});

export const VaultMeta = model<IVaultMeta>('VaultMeta', vaultMetaSchema);
