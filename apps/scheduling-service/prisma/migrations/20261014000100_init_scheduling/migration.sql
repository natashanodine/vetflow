CREATE TABLE `Appointment` (
  `id` CHAR(36) NOT NULL,
  `patientId` CHAR(36) NOT NULL,
  `patientName` VARCHAR(100) NOT NULL,
  `ownerId` CHAR(36) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `details` TEXT NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `durationMinutes` INTEGER NOT NULL DEFAULT 30,
  `category` ENUM('APPOINTMENT', 'TREATMENT', 'REPRODUCTION') NOT NULL DEFAULT 'APPOINTMENT',
  `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Appointment_startsAt_idx`(`startsAt`),
  INDEX `Appointment_patientId_idx`(`patientId`),
  INDEX `Appointment_ownerId_idx`(`ownerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
