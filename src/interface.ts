import { DateTime } from '@easepick/datetime';
import { IBaseConfig } from '@easepick/base-plugin';

export interface IBookingConfig extends IBaseConfig {
  elementEnd?: HTMLElement | string;
  startDate?: DateTime;
  endDate?: DateTime;
  bookings: BookingsAsStringList;
  pendingBookings: BookingsAsStringList;
  bookingCanStartOnEndDate?: boolean;
  bookingCanEndOnStartDate?: boolean;
  minDate?: Date | string | number;
  maxDate?: Date | string | number;
  minDays?: number;
  maxDays?: number;
  filter?: (date: DateTime | DateTime[], picked: DateTime[]) => boolean;
  repick?: boolean;
  strict?: boolean;
  delimiter?: string;
  tooltip?: boolean;
  tooltipNumber?: (num: number) => number;
  locale?: {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other?: string;
  }
  documentClick?: boolean | (() => void);
}

export interface Booking {
  from: DateTime;
  to: DateTime;
}

export type BookingsList = Array<Booking>;

export interface BookingAsString {
  from: string;
  to: string;
}

export type BookingsAsStringList = Array<BookingAsString>;

declare module '@easepick/core' {
  interface Core {
    setStartDate(date: Date | string | number): void;
    setEndDate(date: Date | string | number): void;
    setDateRange(start: Date | string | number, end: Date | string | number): void;
    getStartDate(): DateTime;
    getEndDate(): DateTime;
  }
}

declare module '@easepick/core/dist/types' {
  interface IPickerConfig {
    BookingPlugin?: IBookingConfig;
  }
}
