-- AlterTable
ALTER TABLE `AdminUser` MODIFY `email` VARCHAR(254) NOT NULL;

-- AlterTable
ALTER TABLE `BlogPost` MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `SiteSettings` MODIFY `geminiPromptTemplate` LONGTEXT NOT NULL DEFAULT '';

