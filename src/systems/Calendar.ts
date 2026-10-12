import timeConfig from '../content/time.json';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
// The summer of 1999: 1 June was a Tuesday.
const YEAR = 1999;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The summer at grandma's as numbered days: day 1 is the first date in
 * time.json, the last day is the one the parents come.
 */
export const LAST_DAY = dayOf(timeConfig.summer.lastDate);

/** "08-30" -> the day of the summer it falls on, from 1. */
export function dayOf(date: string): number {
  return Math.round((toDate(date).getTime() - toDate(timeConfig.summer.firstDate).getTime()) / DAY_MS) + 1;
}

/** Day of the summer -> «2 июня». */
export function formatDate(day: number): string {
  const date = dateOf(day);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** 0 is Sunday, as in JavaScript dates. */
export function weekdayOf(day: number): number {
  return dateOf(day).getUTCDay();
}

/** Day of the summer -> «воскресенье». */
export function weekdayName(day: number): string {
  return WEEKDAYS[weekdayOf(day)];
}

function dateOf(day: number): Date {
  return new Date(toDate(timeConfig.summer.firstDate).getTime() + (day - 1) * DAY_MS);
}

function toDate(date: string): Date {
  const [month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(YEAR, month - 1, day));
}
