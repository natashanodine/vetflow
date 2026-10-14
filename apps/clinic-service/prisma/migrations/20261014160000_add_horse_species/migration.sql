-- Add HORSE to the MySQL enum created by the initial clinic migration.
ALTER TABLE `Pet`
MODIFY `species` ENUM('DOG', 'CAT', 'HORSE', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER') NOT NULL;
