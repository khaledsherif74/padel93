import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ar from './ar';
import en from './en';

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(js|jsx)$/.test(entry.name) ? [filePath] : [];
  });
}

function dynamicTranslationKeys() {
  const keys = [
    ...['OWNER', 'ACCOUNTANT', 'STAFF'].map((value) => `role.${value}`),
    ...['CASH', 'VISA', 'INSTAPAY'].map((value) => `method.${value}`),
    ...['OPEN', 'CLOSED'].map((value) => `shiftStatus.${value}`),
    ...['PENDING', 'APPROVED', 'DONE', 'CANCELLED', 'REJECTED', 'WAITLISTED', 'UNKNOWN'].map(
      (value) => `booklyStatus.${value}`,
    ),
    ...['PENDING', 'CONFIRMED', 'DISPUTED', 'RESOLVED', 'CANCELLED'].map(
      (value) => `transferStatus.${value}`,
    ),
    ...['PAID', 'PARTIAL', 'UNPAID', 'OVERPAID', 'UNKNOWN'].map((value) => `payment.${value}`),
    ...['NOT_REQUIRED', 'PENDING', 'VERIFIED', 'REJECTED'].map((value) => `verification.${value}`),
    ...['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'].map((value) => `paymentFlagStatus.${value}`),
    ...['OWNER', 'AUTO_UNDERPAYMENT'].map((value) => `paymentFlagOrigin.${value}`),
    ...['OPEN', 'CLOSED'].map((value) => `accountant.shiftStatus.${value}`),
    ...['OPEN', 'UNRECONCILED', 'GAP', 'PARTIAL', 'COVERED', 'OK'].map(
      (value) => `accountant.reconciliation.${value}`,
    ),
    ...['PENDING', 'CONFIRMED', 'DISPUTED', 'RESOLVED', 'CANCELLED'].map(
      (value) => `accountant.transferStatus.${value}`,
    ),
    ...['VIEW', 'EDIT'].map((value) => `accountant.accessKind.${value}`),
    ...['day', 'month', 'year'].map((value) => `accountant.reportTabs.${value}`),
    ...['IN', 'DONE', 'NOT_IN'].map((value) => `attendance.state${value}`),
    ...['clock-in', 'clock-out', 'break/start', 'break/end'].flatMap((value) => [
      `attendance.done.${value}`,
      `attendance.kind.${value}`,
    ]),
    'attendance.cameraDenied',
    'attendance.cameraUnavailable',
    ...['actorName', 'action', 'entityType', 'entityId', 'ip', 'createdAt'].map(
      (value) => `owner.auditColumns.${value}`,
    ),
    ...['main', 'hours', 'reminders'].map((value) => `hub.links.${value}`),
    ...['finance', 'attendance', 'bookings', 'loyalty', 'bot'].flatMap((value) => [
      `hub.services.${value}.name`,
      `hub.services.${value}.description`,
    ]),
  ];

  const ownerPermissionKeys = [
    'incomeCreate',
    'incomeCreateCard',
    'incomeVerify',
    'expenseCreate',
    'transferCreate',
    'transferConfirm',
    'transferCancel',
    'payoutCreate',
    'booklySync',
    'reportsView',
    'balancesView',
    'shiftsList',
    'seeCustomerPhone',
    'viewOtherDays',
    'goalView',
    'attendanceClock',
    'attendanceView',
    'attendanceAdjust',
    'scheduleManage',
    'payrollManage',
    'appFinance',
    'appAttendance',
    'appBookings',
    'appLoyalty',
    'appWhatsappBot',
  ];
  for (const namespace of ['permission', 'permissionHint']) {
    keys.push(...ownerPermissionKeys.map((value) => `owner.${namespace}.${value}`));
  }

  const srcDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../src');
  const apiErrorSource = fs.readFileSync(path.join(srcDirectory, 'shared/lib/apiError.js'), 'utf8');
  const attendanceBlock = apiErrorSource.match(
    /const ATTENDANCE_CODES = new Set\(\[([\s\S]*?)\]\);/,
  );
  for (const match of attendanceBlock?.[1]?.matchAll(/'([^']+)'/g) ?? []) {
    keys.push(`attendance.errors.${match[1]}`);
  }

  return [...new Set(keys)].sort();
}

function staticTranslationKeys() {
  const srcDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../src');
  const keys = new Set();
  const matcher = /\bt\(\s*['"]([^'"]+)['"]/g;

  for (const filePath of sourceFiles(srcDirectory)) {
    const contents = fs.readFileSync(filePath, 'utf8');
    for (const match of contents.matchAll(matcher)) {
      // Ignore namespace prefixes used to build a key dynamically, e.g. t('method.' + method).
      if (!match[1].endsWith('.')) keys.add(match[1]);
    }
  }

  return [...keys].sort();
}

describe('translation parity', () => {
  it('keeps Arabic and English translation trees aligned', () => {
    const arKeys = leafPaths(ar.translation).sort();
    const enKeys = leafPaths(en.translation).sort();
    expect(arKeys).toEqual(enKeys);
  });

  it('defines every statically referenced translation key', () => {
    const defined = new Set(leafPaths(en.translation));
    const missing = staticTranslationKeys().filter((key) => !defined.has(key));
    expect(missing).toEqual([]);
  });

  it('defines every known dynamic status and data-driven key', () => {
    const defined = new Set(leafPaths(en.translation));
    const missing = dynamicTranslationKeys().filter((key) => !defined.has(key));
    expect(missing).toEqual([]);
  });
});
