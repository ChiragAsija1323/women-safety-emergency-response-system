-- ============================================================
-- Women Safety & Emergency Response System
-- Database: women_safety
-- Compatible with: XAMPP / phpMyAdmin / MySQL 5.7+
-- Usage: Import this file via phpMyAdmin or run:
--        mysql -u root -p < women_safety.sql
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+05:30";

-- --------------------------------------------------------
-- Create & select database
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `women_safety`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `women_safety`;

-- --------------------------------------------------------
-- Disable FK checks during setup
-- --------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABLE: LOCATION
-- ============================================================
DROP TABLE IF EXISTS `LOCATION`;
CREATE TABLE `LOCATION` (
  `LocationID` INT          NOT NULL AUTO_INCREMENT,
  `Area`       VARCHAR(100) NOT NULL,
  `City`       VARCHAR(100) NOT NULL,
  `Latitude`   DECIMAL(10,7) DEFAULT NULL,
  `Longitude`  DECIMAL(10,7) DEFAULT NULL,
  `DateTime`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LocationID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `LOCATION` (`LocationID`, `Area`, `City`, `Latitude`, `Longitude`, `DateTime`) VALUES
(101, 'Anna Nagar',     'Chennai',   13.0850000, 80.2100000, '2026-01-01 08:00:00'),
(102, 'T. Nagar',       'Chennai',   13.0400000, 80.2330000, '2026-01-01 08:05:00'),
(103, 'Velachery',      'Chennai',   12.9815000, 80.2180000, '2026-01-01 08:10:00'),
(104, 'Adyar',          'Chennai',   13.0012000, 80.2565000, '2026-01-01 08:15:00'),
(105, 'Tambaram',       'Chennai',   12.9249000, 80.1000000, '2026-01-01 08:20:00'),
(106, 'Porur',          'Chennai',   13.0350000, 80.1570000, '2026-01-01 08:25:00');

-- ============================================================
-- TABLE: USER
-- ============================================================
DROP TABLE IF EXISTS `USER`;
CREATE TABLE `USER` (
  `UserID`     INT          NOT NULL AUTO_INCREMENT,
  `Name`       VARCHAR(100) NOT NULL,
  `Phone`      VARCHAR(15)  NOT NULL,
  `Email`      VARCHAR(100) NOT NULL,
  `Role`       ENUM('Victim','Responder','Admin') NOT NULL DEFAULT 'Victim',
  `LocationID` INT          DEFAULT NULL,
  PRIMARY KEY (`UserID`),
  FOREIGN KEY (`LocationID`) REFERENCES `LOCATION`(`LocationID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `USER` (`UserID`, `Name`, `Phone`, `Email`, `Role`, `LocationID`) VALUES
(1, 'Aditi',  '9876543219', 'aditi@gmail.com',   'Victim',    101),
(2, 'Riya',   '9123456780', 'riya@gmail.com',    'Victim',    102),
(3, 'Raj',    '9012345678', 'raj@gmail.com',     'Responder', 103),
(4, 'Aman',   '9988776655', 'aman@gmail.com',    'Admin',     104),
(5, 'Neha',   '9090909090', 'neha@gmail.com',    'Victim',    105),
(6, 'Rani',   '123456789',  'Rani13@gmail.com',  'Victim',    106);

-- ============================================================
-- TABLE: RESPONDER
-- ============================================================
DROP TABLE IF EXISTS `RESPONDER`;
CREATE TABLE `RESPONDER` (
  `ResponderID`      INT          NOT NULL AUTO_INCREMENT,
  `ResponderName`    VARCHAR(100) NOT NULL,
  `OrganizationType` ENUM('Police','NGO','Medical','Fire') NOT NULL,
  `Phone`            VARCHAR(15)  DEFAULT NULL,
  `Email`            VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`ResponderID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `RESPONDER` (`ResponderID`, `ResponderName`, `OrganizationType`, `Phone`, `Email`) VALUES
(301, 'Inspector Kumar', 'Police',  '9800000001', 'kumar@police.gov.in'),
(302, 'NGO Team A',      'NGO',     '9800000002', 'teama@ngo.org'),
(303, 'Inspector Singh', 'Police',  '9800000003', 'singh@police.gov.in'),
(304, 'NGO Team B',      'NGO',     '9800000004', 'teamb@ngo.org'),
(305, 'Inspector Roy',   'Police',  '9800000005', 'roy@police.gov.in');

-- ============================================================
-- TABLE: RESPONDER_CONTACT
-- ============================================================
DROP TABLE IF EXISTS `RESPONDER_CONTACT`;
CREATE TABLE `RESPONDER_CONTACT` (
  `ContactID`   INT         NOT NULL AUTO_INCREMENT,
  `ResponderID` INT         NOT NULL,
  `Phone`       VARCHAR(15) NOT NULL,
  `ContactType` ENUM('Primary','Secondary','Emergency') NOT NULL DEFAULT 'Primary',
  PRIMARY KEY (`ContactID`),
  FOREIGN KEY (`ResponderID`) REFERENCES `RESPONDER`(`ResponderID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `RESPONDER_CONTACT` (`ContactID`, `ResponderID`, `Phone`, `ContactType`) VALUES
(1, 301, '9800000001', 'Primary'),
(2, 301, '9800000011', 'Secondary'),
(3, 302, '9800000002', 'Primary'),
(4, 303, '9800000003', 'Primary'),
(5, 304, '9800000004', 'Primary'),
(6, 305, '9800000005', 'Primary');

-- ============================================================
-- TABLE: INCIDENT
-- ============================================================
DROP TABLE IF EXISTS `INCIDENT`;
CREATE TABLE `INCIDENT` (
  `IncidentID`   INT          NOT NULL AUTO_INCREMENT,
  `UserID`       INT          NOT NULL,
  `LocationID`   INT          DEFAULT NULL,
  `IncidentType` VARCHAR(100) NOT NULL,
  `Status`       ENUM('Reported','In-Progress','Resolved','Closed') NOT NULL DEFAULT 'Reported',
  `DateTime`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IncidentID`),
  FOREIGN KEY (`UserID`)     REFERENCES `USER`(`UserID`)         ON DELETE CASCADE,
  FOREIGN KEY (`LocationID`) REFERENCES `LOCATION`(`LocationID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `INCIDENT` (`IncidentID`, `UserID`, `LocationID`, `IncidentType`, `Status`, `DateTime`) VALUES
(201, 1, 101, 'Harassment',  'Reported',    '2026-01-03 10:00:00'),
(202, 2, 102, 'Stalking',    'In-Progress', '2026-02-03 11:30:00'),
(203, 5, 105, 'Assault',     'Resolved',    '2026-03-03 09:15:00'),
(204, 1, 101, 'Harassment',  'Reported',    '2026-04-03 08:45:00'),
(205, 2, 102, 'Stalking',    'In-Progress', '2026-05-03 07:20:00');

-- ============================================================
-- TABLE: INCIDENT_RESPONDER  (bridge table)
-- ============================================================
DROP TABLE IF EXISTS `INCIDENT_RESPONDER`;
CREATE TABLE `INCIDENT_RESPONDER` (
  `IncidentID`  INT      NOT NULL,
  `ResponderID` INT      NOT NULL,
  `AssignedAt`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IncidentID`, `ResponderID`),
  FOREIGN KEY (`IncidentID`)  REFERENCES `INCIDENT`(`IncidentID`)   ON DELETE CASCADE,
  FOREIGN KEY (`ResponderID`) REFERENCES `RESPONDER`(`ResponderID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `INCIDENT_RESPONDER` (`IncidentID`, `ResponderID`, `AssignedAt`) VALUES
(201, 301, '2026-01-03 10:05:00'),
(202, 302, '2026-02-03 11:35:00'),
(203, 303, '2026-03-03 09:20:00'),
(204, 301, '2026-04-03 08:50:00'),
(205, 304, '2026-05-03 07:25:00');

-- ============================================================
-- TABLE: EMERGENCY_CONTACT
-- ============================================================
DROP TABLE IF EXISTS `EMERGENCY_CONTACT`;
CREATE TABLE `EMERGENCY_CONTACT` (
  `ContactID`    INT          NOT NULL AUTO_INCREMENT,
  `UserID`       INT          NOT NULL,
  `ContactName`  VARCHAR(100) NOT NULL,
  `Relationship` VARCHAR(50)  NOT NULL,
  PRIMARY KEY (`ContactID`),
  FOREIGN KEY (`UserID`) REFERENCES `USER`(`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `EMERGENCY_CONTACT` (`ContactID`, `UserID`, `ContactName`, `Relationship`) VALUES
(501, 1, 'Mother',   'Parent'),
(502, 2, 'Father',   'Parent'),
(503, 5, 'Sister',   'Sibling'),
(504, 1, 'Friend',   'Friend'),
(505, 2, 'Guardian', 'Guardian');

-- ============================================================
-- TABLE: EMERGENCY_CONTACT_PHONE
-- ============================================================
DROP TABLE IF EXISTS `EMERGENCY_CONTACT_PHONE`;
CREATE TABLE `EMERGENCY_CONTACT_PHONE` (
  `PhoneID`    INT         NOT NULL AUTO_INCREMENT,
  `ContactID`  INT         NOT NULL,
  `Phone`      VARCHAR(15) NOT NULL,
  PRIMARY KEY (`PhoneID`),
  FOREIGN KEY (`ContactID`) REFERENCES `EMERGENCY_CONTACT`(`ContactID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `EMERGENCY_CONTACT_PHONE` (`PhoneID`, `ContactID`, `Phone`) VALUES
(501, 501, '9999999991'),
(502, 501, '9999999992'),
(503, 502, '8888888883'),
(504, 503, '7777777772'),
(505, 504, '6666666662');

-- ============================================================
-- TABLE: RESPONSE_LOG  (optional audit trail)
-- ============================================================
DROP TABLE IF EXISTS `RESPONSE_LOG`;
CREATE TABLE `RESPONSE_LOG` (
  `LogID`       INT          NOT NULL AUTO_INCREMENT,
  `IncidentID`  INT          NOT NULL,
  `ResponderID` INT          NOT NULL,
  `Action`      VARCHAR(255) NOT NULL,
  `LogTime`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LogID`),
  FOREIGN KEY (`IncidentID`)  REFERENCES `INCIDENT`(`IncidentID`)   ON DELETE CASCADE,
  FOREIGN KEY (`ResponderID`) REFERENCES `RESPONDER`(`ResponderID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `RESPONSE_LOG` (`LogID`, `IncidentID`, `ResponderID`, `Action`, `LogTime`) VALUES
(1, 201, 301, 'Received incident report, dispatching team',        '2026-01-03 10:05:00'),
(2, 202, 302, 'On-site investigation started',                      '2026-02-03 11:40:00'),
(3, 203, 303, 'Victim rescued, case resolved',                      '2026-03-03 12:00:00'),
(4, 204, 301, 'Follow-up on repeated harassment complaint',         '2026-04-03 09:00:00'),
(5, 205, 304, 'NGO counsellor assigned to victim',                  '2026-05-03 07:30:00');

-- ============================================================
-- Re-enable FK checks
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ============================================================
-- QUICK VERIFICATION QUERIES (run manually to confirm)
-- ============================================================
-- SELECT * FROM USER;
-- SELECT * FROM INCIDENT;
-- SELECT * FROM RESPONDER;
-- SELECT * FROM INCIDENT_RESPONDER;
-- SELECT * FROM LOCATION;
-- SELECT * FROM EMERGENCY_CONTACT;
-- SELECT * FROM EMERGENCY_CONTACT_PHONE;
-- SELECT * FROM RESPONDER_CONTACT;
-- SELECT * FROM RESPONSE_LOG;
