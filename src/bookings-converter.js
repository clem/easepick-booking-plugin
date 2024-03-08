"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsConverter = void 0;
var datetime_1 = require("@easepick/datetime");
var BookingsConverter = /** @class */ (function () {
    function BookingsConverter() {
    }
    BookingsConverter.prototype.convert = function (bookings) {
        return this.combineAdjacentBookings(this.convertAndSortBookings(bookings));
    };
    BookingsConverter.prototype.convertAndSortBookings = function (bookings) {
        return bookings.map(function (booking) {
            return { from: new datetime_1.DateTime(booking.from), to: new datetime_1.DateTime(booking.to) };
        }).sort(function (left, right) {
            return left.from.valueOf() - right.from.valueOf();
        });
    };
    BookingsConverter.prototype.combineAdjacentBookings = function (bookings) {
        var combinedBookings = [];
        bookings.forEach(function (booking) {
            if (combinedBookings.length === 0) {
                combinedBookings.push(booking);
                return;
            }
            var lastAddedBooking = combinedBookings[combinedBookings.length - 1];
            if (booking.from.isSame(lastAddedBooking.to, 'day')) {
                lastAddedBooking.to = booking.to;
                return;
            }
            combinedBookings.push(booking);
        });
        return combinedBookings;
    };
    return BookingsConverter;
}());
exports.BookingsConverter = BookingsConverter;
