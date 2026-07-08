import { da } from "date-fns/locale";
import moment from "moment";

/**
 * Returns relative time (e.g. "2 days ago", "in 3 hours")
 */
export const timeAgo = (date: string | Date): string => {
  const dateStr = formatDate({ date });
  return moment(dateStr).fromNow();
};

/**
 * Returns relative time without suffix (e.g. "2 days")
 */
export const timeAgoWithoutSuffix = (date: string | Date): string => {
  return moment.utc(date).local().fromNow(true);
};

/**
 * Returns days left until a future date.
 * Returns 0 if the date has already passed.
 */
export const daysLeft = (date: string | Date): number => {
  return Math.max(
    0,
    Math.ceil(moment(formatDate({ date })).diff(moment(), "days", true)),
  );
};

/**
 * Formats a date.
 */
export const formatDate = ({
  date,
  format = "YYYY-MM-DD HH:mm:ss",
  isUtc = true,
}: {
  date: string | Date;
  format?: string;
  isUtc?: boolean;
}): string => {
  if (isUtc) {
    return moment.utc(date).format(format);
  }
  return moment(date).format(format);
};
