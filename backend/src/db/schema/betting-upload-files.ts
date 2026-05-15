import { pgTable, index } from "drizzle-orm/pg-core";
import {
  bettingUploadKindEnum,
  createdAtColumn,
  idColumn,
  integer,
  jsonb,
  uploadLifecycleStatusEnum,
  uploadStorageProviderEnum,
  uuid,
  varchar
} from "./shared.js";
import { users } from "./users.js";
import { dataSources } from "./data-sources.js";
import { ingestionSessions } from "./ingestion-sessions.js";

export const bettingUploadFiles = pgTable(
  "betting_upload_files",
  {
    id: idColumn,
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    ingestionSessionId: uuid("ingestion_session_id").notNull().references(() => ingestionSessions.id, { onDelete: "cascade" }),
    kind: bettingUploadKindEnum("kind").notNull(),
    storageProvider: uploadStorageProviderEnum("storage_provider").notNull().default("cloudinary"),
    lifecycleStatus: uploadLifecycleStatusEnum("lifecycle_status").notNull().default("initiated"),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    publicUrl: varchar("public_url", { length: 2048 }).notNull(),
    storageObjectKey: varchar("storage_object_key", { length: 255 }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    uploadOrder: integer("upload_order").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAtColumn
  },
  (table) => ({
    sessionOrderIdx: index("betting_upload_files_session_order_idx").on(table.ingestionSessionId, table.uploadOrder),
    sessionKindIdx: index("betting_upload_files_session_kind_idx").on(table.ingestionSessionId, table.kind),
    storageObjectIdx: index("betting_upload_files_storage_object_idx").on(table.storageObjectKey)
  })
);
