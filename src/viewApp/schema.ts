import {
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
  } from 'drizzle-orm/pg-core'

export const notesTable = pgTable('notes', {
    id: serial('id').primaryKey(),
    msg: text('msg'),
    created: timestamp('created').defaultNow(),
});
