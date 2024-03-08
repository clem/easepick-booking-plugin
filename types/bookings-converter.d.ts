import { BookingsAsStringList, BookingsList } from "./interface";
export declare class BookingsConverter {
    convert(bookings: BookingsAsStringList): BookingsList;
    private convertAndSortBookings;
    private combineAdjacentBookings;
}
