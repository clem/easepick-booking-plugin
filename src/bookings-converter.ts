import {BookingsAsStringList, BookingsList} from "./interface";
import {DateTime} from "@easepick/datetime";

export class BookingsConverter {
  public convert(bookings: BookingsAsStringList): BookingsList {
    return this.combineAdjacentBookings(
        this.convertAndSortBookings(bookings)
    );
  }

  private convertAndSortBookings(bookings: BookingsAsStringList): BookingsList {
    return bookings.map(booking => {
      return { from: new DateTime(booking.from), to: new DateTime(booking.to) };
    }).sort((left, right) => {
      return left.from.valueOf() - right.from.valueOf();
    });
  }

  private combineAdjacentBookings(bookings: BookingsList): BookingsList {
    const combinedBookings = [];

    bookings.forEach(booking => {
      if (combinedBookings.length === 0) {
        combinedBookings.push(booking);

        return;
      }

      const lastAddedBooking = combinedBookings[combinedBookings.length - 1];

      if (booking.from.isSame(lastAddedBooking.to, 'day')) {
        lastAddedBooking.to = booking.to;

        return;
      }

      combinedBookings.push(booking);
    });

    return combinedBookings;
  }
}
