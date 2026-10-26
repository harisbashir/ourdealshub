-- A digest can contain up to 100 event summaries in a single message.
ALTER TABLE `MailDelivery` MODIFY `text` LONGTEXT NOT NULL;
