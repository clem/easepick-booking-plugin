"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingPlugin = void 0;
var datetime_1 = require("@easepick/datetime");
var base_plugin_1 = require("@easepick/base-plugin");
require("./index.scss");
var bookings_converter_1 = require("./bookings-converter");
var BookingPlugin = /** @class */ (function (_super) {
    __extends(BookingPlugin, _super);
    function BookingPlugin() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.bookingsConverter = new bookings_converter_1.BookingsConverter();
        _this.bookingsImpossibleDates = [];
        _this.binds = {
            setStartDate: _this.setStartDate.bind(_this),
            setEndDate: _this.setEndDate.bind(_this),
            setDateRange: _this.setDateRange.bind(_this),
            getStartDate: _this.getStartDate.bind(_this),
            getEndDate: _this.getEndDate.bind(_this),
            onView: _this.onView.bind(_this),
            onShow: _this.onShow.bind(_this),
            onMouseEnter: _this.onMouseEnter.bind(_this),
            onClickCalendarDay: _this.onClickCalendarDay.bind(_this),
            onClickApplyButton: _this.onClickApplyButton.bind(_this),
            parseValues: _this.parseValues.bind(_this),
            updateValues: _this.updateValues.bind(_this),
            clear: _this.clear.bind(_this),
        };
        _this.options = {
            elementEnd: null,
            startDate: null,
            endDate: null,
            bookings: [],
            pendingBookings: [],
            bookingCanStartOnEndDate: true,
            bookingCanEndOnStartDate: true,
            minDate: null,
            maxDate: null,
            minDays: null,
            maxDays: null,
            filter: null,
            strict: true,
            delimiter: ' - ',
            tooltip: true,
            tooltipNumber: function (num) {
                return num;
            },
            locale: {
                zero: '',
                one: 'day',
                two: '',
                few: '',
                many: '',
                other: 'days',
            },
            documentClick: _this.hidePicker.bind(_this),
        };
        return _this;
    }
    /**
     * Returns plugin name
     *
     * @returns String
     */
    BookingPlugin.prototype.getName = function () {
        return 'BookingPlugin';
    };
    /**
     * - Called automatically via BasePlugin.attach() -
     * The function execute on initialize the picker
     */
    BookingPlugin.prototype.onAttach = function () {
        var pickerPlugins = this.picker.options.plugins;
        if (pickerPlugins.includes('RangePlugin') || pickerPlugins.includes('LockPlugin')) {
            throw new Error('BookingPlugin can not be used with RangePlugin or LockPlugin as it is a combination of both');
        }
        this.binds['_setStartDate'] = this.picker.setStartDate;
        this.binds['_setEndDate'] = this.picker.setEndDate;
        this.binds['_setDateRange'] = this.picker.setDateRange;
        this.binds['_getStartDate'] = this.picker.getStartDate;
        this.binds['_getEndDate'] = this.picker.getEndDate;
        this.binds['_parseValues'] = this.picker.parseValues;
        this.binds['_updateValues'] = this.picker.updateValues;
        this.binds['_clear'] = this.picker.clear;
        this.binds['_onClickCalendarDay'] = this.picker.onClickCalendarDay;
        this.binds['_onClickApplyButton'] = this.picker.onClickApplyButton;
        Object.defineProperties(this.picker, {
            setStartDate: { configurable: true, value: this.binds.setStartDate },
            setEndDate: { configurable: true, value: this.binds.setEndDate },
            setDateRange: { configurable: true, value: this.binds.setDateRange },
            getStartDate: { configurable: true, value: this.binds.getStartDate },
            getEndDate: { configurable: true, value: this.binds.getEndDate },
            parseValues: { configurable: true, value: this.binds.parseValues },
            updateValues: { configurable: true, value: this.binds.updateValues },
            clear: { configurable: true, value: this.binds.clear },
            onClickCalendarDay: { configurable: true, value: this.binds.onClickCalendarDay },
            onClickApplyButton: { configurable: true, value: this.binds.onClickApplyButton }
        });
        if (this.options.elementEnd) {
            if (!(this.options.elementEnd instanceof HTMLElement)) {
                this.options.elementEnd = this.picker
                    .options
                    .doc.querySelector(this.options.elementEnd);
            }
            if (this.options.elementEnd instanceof HTMLInputElement) {
                this.options.elementEnd.readOnly = this.picker.options.readonly;
            }
            if (typeof this.picker.options.documentClick === 'function') {
                document.removeEventListener('click', this.picker.options.documentClick, true);
                if (typeof this.options.documentClick === 'function') {
                    document.addEventListener('click', this.options.documentClick, true);
                }
            }
            this.options.elementEnd.addEventListener('click', this.picker.show.bind(this.picker));
        }
        this.picker.options.date = null;
        this.bookings = this.bookingsConverter.convert(this.options.bookings);
        this.pendingBookings = this.bookingsConverter.convert(this.options.pendingBookings);
        this.bookingsImpossibleDates = this.getBookingsImpossibleDates();
        if (this.options.minDate) {
            this.options.minDate = new datetime_1.DateTime(this.options.minDate, this.picker.options.format, this.picker.options.lang);
        }
        if (this.options.maxDate) {
            this.options.maxDate = new datetime_1.DateTime(this.options.maxDate, this.picker.options.format, this.picker.options.lang);
            if (this.options.maxDate instanceof datetime_1.DateTime
                && this.picker.options.calendars > 1
                && this.picker.calendars[0].isSame(this.options.maxDate, 'month')) {
                var d = this.picker.calendars[0].clone().subtract(1, 'month');
                this.picker.gotoDate(d);
            }
        }
        this.picker.on('view', this.binds.onView);
        this.picker.on('show', this.binds.onShow);
        this.picker.on('mouseenter', this.binds.onMouseEnter, true);
        this.checkIntlPluralLocales();
    };
    BookingPlugin.prototype.getBookingsImpossibleDates = function () {
        var _this = this;
        if (!this.options.minDays) {
            return [];
        }
        var impossibleDates = [];
        if (this.options.minDate) {
            var minDate = this.options.minDate instanceof datetime_1.DateTime
                ? this.options.minDate
                : new datetime_1.DateTime(this.options.minDate);
            var firstBooking = this.bookings[0] || null;
            if (firstBooking && firstBooking.from.isBefore(minDate.clone().add(this.options.minDays), 'day')) {
                impossibleDates.push.apply(impossibleDates, this.getDatesBetween(minDate, firstBooking.from));
            }
        }
        this.bookings.forEach(function (booking, index) {
            var nextBooking = _this.bookings[index + 1] || null;
            if (nextBooking && nextBooking.from.isBefore(booking.to.clone().add(_this.options.minDays, 'day'))) {
                impossibleDates.push.apply(impossibleDates, _this.getDatesBetween(booking.to, nextBooking.from));
            }
        });
        if (this.options.maxDate) {
            var maxDate = this.options.maxDate instanceof datetime_1.DateTime
                ? this.options.maxDate
                : new datetime_1.DateTime(this.options.maxDate);
            var lastBooking = this.bookings[0] || null;
            if (lastBooking && lastBooking.to.isBefore(maxDate.clone().add(this.options.minDays), 'day')) {
                impossibleDates.push.apply(impossibleDates, this.getDatesBetween(lastBooking.to, maxDate));
            }
        }
        return impossibleDates;
    };
    BookingPlugin.prototype.getDatesBetween = function (start, end) {
        var dates = [];
        var date = start.clone();
        while (date.isSameOrBefore(end)) {
            dates.push(date.clone());
            date = date.clone().add(1, 'day');
        }
        return dates;
    };
    /**
     * - Called automatically via BasePlugin.detach() -
     */
    BookingPlugin.prototype.onDetach = function () {
        Object.defineProperties(this.picker, {
            setStartDate: { configurable: true, value: this.binds['_setStartDate'] },
            setEndDate: { configurable: true, value: this.binds['_setEndDate'] },
            setDateRange: { configurable: true, value: this.binds['_setDateRange'] },
            getStartDate: { configurable: true, value: this.binds['_getStartDate'] },
            getEndDate: { configurable: true, value: this.binds['_getEndDate'] },
            parseValues: { configurable: true, value: this.binds['_parseValues'] },
            updateValues: { configurable: true, value: this.binds['_updateValues'] },
            clear: { configurable: true, value: this.binds['_clear'] },
            onClickCalendarDay: { configurable: true, value: this.binds['_onClickCalendarDay'] },
            onClickApplyButton: { configurable: true, value: this.binds['_onClickApplyButton'] }
        });
        this.picker.off('view', this.binds.onView);
        this.picker.off('show', this.binds.onShow);
        this.picker.off('mouseenter', this.binds.onMouseEnter, true);
    };
    /**
     * Parse `startDate`, `endDate` options or value of input elements
     */
    BookingPlugin.prototype.parseValues = function () {
        if (this.options.startDate || this.options.endDate) {
            if (this.options.strict) {
                if (this.options.startDate && this.options.endDate) {
                    this.setDateRange(this.options.startDate, this.options.endDate);
                }
                else {
                    this.options.startDate = null;
                    this.options.endDate = null;
                }
            }
            else {
                if (this.options.startDate) {
                    this.setStartDate(this.options.startDate);
                }
                if (this.options.endDate) {
                    this.setEndDate(this.options.endDate);
                }
            }
            return;
        }
        if (this.options.elementEnd) {
            if (this.options.strict) {
                if (this.picker.options.element instanceof HTMLInputElement
                    && this.picker.options.element.value.length
                    && this.options.elementEnd instanceof HTMLInputElement
                    && this.options.elementEnd.value.length) {
                    this.setDateRange(this.picker.options.element.value, this.options.elementEnd.value);
                }
            }
            else {
                if (this.picker.options.element instanceof HTMLInputElement
                    && this.picker.options.element.value.length) {
                    this.setStartDate(this.picker.options.element.value);
                }
                if (this.options.elementEnd instanceof HTMLInputElement
                    && this.options.elementEnd.value.length) {
                    this.setEndDate(this.options.elementEnd.value);
                }
            }
        }
        else if (this.picker.options.element instanceof HTMLInputElement && this.picker.options.element.value.length) {
            var _a = this.picker.options.element.value.split(this.options.delimiter), _start = _a[0], _end = _a[1];
            if (this.options.strict) {
                if (_start && _end) {
                    this.setDateRange(_start, _end);
                }
            }
            else {
                if (_start)
                    this.setStartDate(_start);
                if (_end)
                    this.setEndDate(_end);
            }
        }
    };
    /**
     * Update value of input element
     */
    BookingPlugin.prototype.updateValues = function () {
        var el = this.picker.options.element;
        var elEnd = this.options.elementEnd;
        var start = this.picker.getStartDate();
        var end = this.picker.getEndDate();
        var startString = start instanceof Date
            ? start.format(this.picker.options.format, this.picker.options.lang)
            : '';
        var endString = end instanceof Date
            ? end.format(this.picker.options.format, this.picker.options.lang)
            : '';
        if (elEnd) {
            if (el instanceof HTMLInputElement) {
                el.value = startString;
            }
            else if (el instanceof HTMLElement) {
                el.innerText = startString;
            }
            if (elEnd instanceof HTMLInputElement) {
                elEnd.value = endString;
            }
            else if (elEnd instanceof HTMLElement) {
                elEnd.innerText = endString;
            }
        }
        else {
            var delimiter = startString || endString ? this.options.delimiter : '';
            var formatString = "".concat(startString).concat(delimiter).concat(endString);
            if (el instanceof HTMLInputElement) {
                el.value = formatString;
            }
            else if (el instanceof HTMLElement) {
                el.innerText = formatString;
            }
        }
    };
    /**
     * Clear selection
     */
    BookingPlugin.prototype.clear = function () {
        this.options.startDate = null;
        this.options.endDate = null;
        this.picker.datePicked.length = 0;
        this.updateValues();
        this.picker.renderAll();
        this.picker.trigger('clear');
    };
    /**
     * Function `show` event
     *
     * @param event
     */
    BookingPlugin.prototype.onShow = function (event) {
        var target = event.detail.target;
        this.triggerElement = target;
        if (this.picker.options.scrollToDate && this.getStartDate() instanceof Date) {
            this.picker.gotoDate(this.getStartDate());
        }
    };
    BookingPlugin.prototype.onMainView = function (event) {
        var target = event.detail.target;
        this.tooltipElement = document.createElement('span');
        this.tooltipElement.className = 'booking-plugin-tooltip';
        target.appendChild(this.tooltipElement);
    };
    BookingPlugin.prototype.onCalendarHeaderView = function (event) {
        var _a = event.detail, target = _a.target, date = _a.date;
        if (this.options.minDate instanceof datetime_1.DateTime && date.isSameOrBefore(this.options.minDate, 'month')) {
            target.classList.add('no-previous-month');
        }
        if (this.options.maxDate instanceof datetime_1.DateTime && date.isSameOrAfter(this.options.maxDate, 'month')) {
            target.classList.add('no-next-month');
        }
    };
    BookingPlugin.prototype.updateCalendarDayRangedView = function (target, date, start, end) {
        if (start && start.isSame(date, 'day')) {
            target.classList.add('start');
        }
        if (start && end) {
            if (end.isSame(date, 'day')) {
                target.classList.add('end');
            }
            if (date.isBetween(start, end)) {
                target.classList.add('in-range');
            }
        }
    };
    BookingPlugin.prototype.updateCalendarDayBookedView = function (target, date) {
        if (this.testFilter(date)) {
            target.classList.add('locked');
            return;
        }
        if (this.options.minDays) {
            this.lockCalendarMinDays(target, date);
            this.lockCalendarMinDaysWithBookings(target, date);
        }
        this.updateCalendarDayBookedViewWithBookings(target, date);
        if (this.isTargetAvailable(target) && this.dateIsNotAvailable(date, null)) {
            target.classList.add('not-available');
        }
    };
    BookingPlugin.prototype.updateCalendarDayBookedViewWithBookings = function (target, date) {
        if (this.dateIsAlreadyBooked(date)) {
            target.classList.add('locked');
            return;
        }
        if (this.dateMatchesBookingStartDate(date)) {
            if (!this.options.bookingCanEndOnStartDate) {
                target.classList.add('locked');
                return;
            }
            target.classList.add('only-end-available');
            if (this.dateMatchesPendingBookingEndDate(date)) {
                target.classList.add('pending-booking-end-date');
            }
        }
        if (this.dateMatchesBookingEndDate(date)) {
            if (!this.options.bookingCanStartOnEndDate) {
                target.classList.add('locked');
                return;
            }
            target.classList.add('only-start-available');
            if (this.dateMatchesPendingBookingStartDate(date)) {
                target.classList.add('pending-booking-start-date');
            }
        }
        if (target.classList.contains('only-start-available') && target.classList.contains('only-end-available')) {
            target.classList.remove('only-start-available', 'only-end-available');
            target.classList.add('locked');
        }
        if (!target.classList.contains('locked') && this.dateMatchesPendingBookingDate(date)) {
            target.classList.add('pending');
        }
    };
    BookingPlugin.prototype.isTargetAvailable = function (target) {
        return !target.classList.contains('not-available')
            && !target.classList.contains('locked')
            && !target.classList.contains('pending');
    };
    BookingPlugin.prototype.dateMatchesBookingStartDate = function (date) {
        return this.bookings.some(function (booking) { return booking.from.isSame(date, 'day'); });
    };
    BookingPlugin.prototype.dateMatchesBookingEndDate = function (date) {
        return this.bookings.some(function (booking) { return booking.to.isSame(date, 'day'); });
    };
    BookingPlugin.prototype.dateMatchesPendingBookingStartDate = function (date) {
        return this.pendingBookings.some(function (pendingBooking) { return pendingBooking.from.isSame(date, 'day'); });
    };
    BookingPlugin.prototype.dateMatchesPendingBookingEndDate = function (date) {
        return this.pendingBookings.some(function (pendingBooking) { return pendingBooking.to.isSame(date, 'day'); });
    };
    BookingPlugin.prototype.dateMatchesPendingBookingDate = function (date) {
        for (var _i = 0, _a = this.pendingBookings; _i < _a.length; _i++) {
            var pendingBooking = _a[_i];
            if (date.isBetween(pendingBooking.from, pendingBooking.to, '()')) {
                return true;
            }
        }
        return false;
    };
    BookingPlugin.prototype.lockCalendarMinDays = function (target, date) {
        var date1 = date.clone().subtract(this.options.minDays - 1, 'day');
        var date2 = date.clone().add(this.options.minDays - 1, 'day');
        var lockedInPrevDays = false;
        var lockedInNextDays = false;
        while (date1.isBefore(date, 'day')) {
            if (this.testFilter(date1)) {
                lockedInPrevDays = true;
                break;
            }
            date1.add(1, 'day');
        }
        while (date2.isAfter(date, 'day')) {
            if (this.testFilter(date2)) {
                lockedInNextDays = true;
                break;
            }
            date2.subtract(1, 'day');
        }
        if (lockedInPrevDays && lockedInNextDays) {
            target.classList.add('not-available');
        }
    };
    BookingPlugin.prototype.lockCalendarMinDaysWithBookings = function (target, date) {
        if (this.bookingsImpossibleDates.find(function (impossibleDate) { return impossibleDate.isSame(date, 'day'); })) {
            target.classList.add('not-available');
        }
    };
    BookingPlugin.prototype.onCalendarDayView = function (event) {
        var _a = event.detail, target = _a.target, date = _a.date;
        this.updateCalendarDayBookedView(target, date);
        var datePicked = this.picker.datePicked;
        var start = datePicked.length ? this.picker.datePicked[0] : this.getStartDate();
        var end = datePicked.length ? this.picker.datePicked[1] : this.getEndDate();
        this.updateCalendarDayRangedView(target, new datetime_1.DateTime(target.dataset.time), start, end);
        if (start && !end) {
            this.lockCalendarMaxDays(target, date, start);
            this.updateCalendarDayRangedViewWithBookings(target, date, start);
        }
    };
    BookingPlugin.prototype.updateCalendarDayRangedViewWithBookings = function (target, date, start) {
        var previousBookingEndDate = this.getMinBookingDate(start);
        if (previousBookingEndDate && date.isBefore(previousBookingEndDate, 'day')) {
            target.classList.add('not-available');
            return;
        }
        var nextBookingStartDate = this.getMaxBookingDate(start);
        if (nextBookingStartDate && date.isAfter(nextBookingStartDate, 'day')) {
            target.classList.add('not-available');
            return;
        }
    };
    BookingPlugin.prototype.getMinBookingDate = function (date) {
        var previousBookingEndDate = this.getPreviousBookingEndDate(date);
        var optionsMinDate = this.options.minDate instanceof datetime_1.DateTime ? this.options.minDate : null;
        if (!previousBookingEndDate && !optionsMinDate) {
            return null;
        }
        if (!previousBookingEndDate && optionsMinDate) {
            return optionsMinDate;
        }
        if (previousBookingEndDate && !optionsMinDate) {
            return previousBookingEndDate;
        }
        return previousBookingEndDate.isAfter(optionsMinDate) ? previousBookingEndDate : optionsMinDate;
    };
    BookingPlugin.prototype.getPreviousBookingEndDate = function (date) {
        var bookings = this.bookings.filter(function (booking) { return booking.to.isSameOrBefore(date, 'day'); });
        if (bookings.length) {
            return bookings[bookings.length - 1].to;
        }
        return null;
    };
    BookingPlugin.prototype.getMaxBookingDate = function (date) {
        var nextBookingEndDate = this.getNextBookingEndDate(date);
        var optionsMaxDate = this.options.maxDate instanceof datetime_1.DateTime ? this.options.maxDate : null;
        if (!nextBookingEndDate && !optionsMaxDate) {
            return null;
        }
        if (!nextBookingEndDate && optionsMaxDate) {
            return optionsMaxDate;
        }
        if (nextBookingEndDate && !optionsMaxDate) {
            return nextBookingEndDate;
        }
        return nextBookingEndDate.isBefore(optionsMaxDate) ? nextBookingEndDate : optionsMaxDate;
    };
    BookingPlugin.prototype.getNextBookingEndDate = function (date) {
        var bookings = this.bookings.filter(function (booking) { return booking.from.isSameOrAfter(date, 'day'); });
        if (bookings.length) {
            return bookings[0].from;
        }
        return null;
    };
    BookingPlugin.prototype.lockCalendarMaxDays = function (target, date, start) {
        if (this.lockMaxDays(date, start)) {
            target.classList.add('not-available');
        }
    };
    BookingPlugin.prototype.onFooterView = function (event) {
        var target = event.detail.target;
        // RangePlugin
        var allowApplyBtn = (this.picker.datePicked.length === 1 && !this.options.strict)
            || this.picker.datePicked.length === 2;
        var applyButton = target.querySelector('.apply-button');
        applyButton.disabled = !allowApplyBtn;
    };
    /**
     * Function `view` event
     * Adds HTML layout of current plugin to the picker layout
     *
     * @param event
     */
    BookingPlugin.prototype.onView = function (event) {
        var view = event.detail.view;
        if (view === 'Main') {
            this.onMainView(event);
        }
        if (view === 'CalendarHeader') {
            this.onCalendarHeaderView(event);
        }
        if (view === 'CalendarDay') {
            this.onCalendarDayView(event);
        }
        if (view === 'Footer') {
            this.onFooterView(event);
        }
    };
    /**
     * Function for documentClick option
     * Allows the picker to close when the user clicks outside
     *
     * @param e
     */
    BookingPlugin.prototype.hidePicker = function (e) {
        var target = e.target;
        var host = null;
        if (target.shadowRoot) {
            target = e.composedPath()[0];
            host = target.getRootNode().host;
        }
        if (this.picker.isShown()
            && host !== this.picker.ui.wrapper
            && target !== this.picker.options.element
            && target !== this.options.elementEnd) {
            this.picker.hide();
        }
    };
    /**
     * Set startDate programmatically
     *
     * @param date
     */
    BookingPlugin.prototype.setStartDate = function (date) {
        var d = new datetime_1.DateTime(date, this.picker.options.format);
        this.options.startDate = d ? d.clone() : null;
        this.updateValues();
        this.picker.renderAll();
    };
    /**
     * Set endDate programmatically
     *
     * @param date
     */
    BookingPlugin.prototype.setEndDate = function (date) {
        var d = new datetime_1.DateTime(date, this.picker.options.format);
        this.options.endDate = d ? d.clone() : null;
        this.updateValues();
        this.picker.renderAll();
    };
    /**
     * Set date range programmatically
     *
     * @param start
     * @param end
     */
    BookingPlugin.prototype.setDateRange = function (start, end) {
        var startDate = new datetime_1.DateTime(start, this.picker.options.format);
        var endDate = new datetime_1.DateTime(end, this.picker.options.format);
        this.options.startDate = startDate ? startDate.clone() : null;
        this.options.endDate = endDate ? endDate.clone() : null;
        this.updateValues();
        this.picker.renderAll();
    };
    /**
     *
     * @returns DateTime
     */
    BookingPlugin.prototype.getStartDate = function () {
        return this.options.startDate instanceof Date ? this.options.startDate.clone() : null;
    };
    /**
     *
     * @returns
     */
    BookingPlugin.prototype.getEndDate = function () {
        return this.options.endDate instanceof Date ? this.options.endDate.clone() : null;
    };
    /**
     * Handle `filter` option
     *
     * @param date
     * @returns Boolean
     */
    BookingPlugin.prototype.testFilter = function (date) {
        return typeof this.options.filter === 'function'
            ? this.options.filter(date, this.picker.datePicked)
            : false;
    };
    /**
     * Checks availability date
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    BookingPlugin.prototype.dateIsNotAvailable = function (date, start) {
        return this.lockMinDate(date)
            || this.lockMaxDate(date)
            || this.lockMinDays(date, start)
            || this.lockMaxDays(date, start)
            || this.lockSelectForward(date)
            || this.lockSelectBackward(date);
    };
    BookingPlugin.prototype.dateIsAlreadyBooked = function (date) {
        for (var _i = 0, _a = this.bookings; _i < _a.length; _i++) {
            var booking = _a[_i];
            if (date.isBetween(booking.from, booking.to, '()')) {
                return true;
            }
        }
        return false;
    };
    /**
     * Handle `minDate` option
     *
     * @param date
     * @returns Boolean
     */
    BookingPlugin.prototype.lockMinDate = function (date) {
        return this.options.minDate instanceof datetime_1.DateTime
            ? date.isBefore(this.options.minDate, 'day')
            : false;
    };
    /**
     * Handle `maxDate` option
     *
     * @param date
     * @returns Boolean
     */
    BookingPlugin.prototype.lockMaxDate = function (date) {
        return this.options.maxDate instanceof datetime_1.DateTime
            ? date.isAfter(this.options.maxDate, 'day')
            : false;
    };
    /**
     * Handle `minDays` option
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    BookingPlugin.prototype.lockMinDays = function (date, start) {
        if (this.options.minDays && start) {
            var minPrev = start
                .clone()
                .subtract(this.options.minDays - 1, 'day');
            var minNext = start
                .clone()
                .add(this.options.minDays - 1, 'day');
            return date.isBetween(minPrev, minNext);
        }
        return false;
    };
    /**
     * Handle `maxDays` option
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    BookingPlugin.prototype.lockMaxDays = function (date, start) {
        if (this.options.maxDays && start) {
            var maxPrev = start
                .clone()
                .subtract(this.options.maxDays, 'day');
            var maxNext = start
                .clone()
                .add(this.options.maxDays, 'day');
            return !date.isBetween(maxPrev, maxNext);
        }
        return false;
    };
    /**
     * Handle `selectForward` option
     *
     * @param date
     * @returns Boolean
     */
    BookingPlugin.prototype.lockSelectForward = function (date) {
        if (this.picker.datePicked.length === 1 && this.selectForward) {
            var start = this.picker.datePicked[0].clone();
            return date.isBefore(start, 'day');
        }
        return false;
    };
    /**
     * Handle `selectBackward` option
     *
     * @param date
     * @returns Boolean
     */
    BookingPlugin.prototype.lockSelectBackward = function (date) {
        if (this.picker.datePicked.length === 1 && this.selectBackward) {
            var start = this.picker.datePicked[0].clone();
            return date.isAfter(start, 'day');
        }
        return false;
    };
    /**
     * Handle `mouseenter` event
     *
     * @param event
     */
    BookingPlugin.prototype.onMouseEnter = function (event) {
        var _this = this;
        var target = event.target;
        if (target instanceof HTMLElement) {
            var element_1 = target.closest('.unit');
            if (!(element_1 instanceof HTMLElement))
                return;
            if (this.picker.isCalendarDay(element_1)) {
                if (this.picker.datePicked.length !== 1)
                    return;
                var date1_1 = this.picker.datePicked[0].clone();
                var date2_1 = new datetime_1.DateTime(element_1.dataset.time);
                var isFlipped_1 = false;
                if (date1_1.isAfter(date2_1, 'day')) {
                    var tempDate = date1_1.clone();
                    date1_1 = date2_1.clone();
                    date2_1 = tempDate.clone();
                    isFlipped_1 = true;
                }
                var days = __spreadArray([], this.picker.ui.container.querySelectorAll('.day'), true);
                days.forEach(function (d) {
                    var date = new datetime_1.DateTime(d.dataset.time);
                    var dayView = _this.picker.Calendar.getCalendarDayView(date);
                    if (date.isBetween(date1_1, date2_1)) {
                        dayView.classList.add('in-range');
                    }
                    if (date.isSame(_this.picker.datePicked[0], 'day')) {
                        dayView.classList.add('start');
                        dayView.classList.toggle('flipped', isFlipped_1);
                    }
                    if (d === element_1) {
                        dayView.classList.add('end');
                        dayView.classList.toggle('flipped', isFlipped_1);
                    }
                    d.className = dayView.className;
                });
                if (this.options.tooltip) {
                    var diff = this.options.tooltipNumber(date2_1.diff(date1_1, 'day') + 1);
                    if (diff > 0) {
                        var pluralKey = new Intl.PluralRules(this.picker.options.lang).select(diff);
                        var text = "".concat(diff, " ").concat(this.options.locale[pluralKey]);
                        this.showTooltip(element_1, text);
                    }
                    else {
                        this.hideTooltip();
                    }
                }
            }
        }
    };
    /**
     * Handle `mouseleave` event
     *
     * @param event
     */
    BookingPlugin.prototype.onClickCalendarDay = function (element) {
        if (!this.picker.isCalendarDay(element)) {
            return;
        }
        if (this.picker.datePicked.length === 2) {
            this.picker.datePicked.length = 0;
        }
        var date = new datetime_1.DateTime(element.dataset.time);
        this.picker.datePicked[this.picker.datePicked.length] = date;
        if (this.picker.datePicked.length === 2 && this.picker.datePicked[0].isAfter(this.picker.datePicked[1])) {
            var tempDate = this.picker.datePicked[1].clone();
            this.picker.datePicked[1] = this.picker.datePicked[0].clone();
            this.picker.datePicked[0] = tempDate.clone();
        }
        if (this.picker.datePicked.length === 1 || !this.picker.options.autoApply) {
            this.picker.trigger('preselect', {
                start: this.picker.datePicked[0] instanceof Date ? this.picker.datePicked[0].clone() : null,
                end: this.picker.datePicked[1] instanceof Date ? this.picker.datePicked[1].clone() : null,
            });
        }
        if (this.picker.datePicked.length === 1) {
            if (!this.options.strict && this.picker.options.autoApply) {
                if (this.picker.options.element === this.triggerElement) {
                    this.setStartDate(this.picker.datePicked[0]);
                }
                if (this.options.elementEnd === this.triggerElement) {
                    this.setEndDate(this.picker.datePicked[0]);
                }
                this.picker.trigger('select', { start: this.picker.getStartDate(), end: this.picker.getEndDate() });
            }
            this.picker.renderAll();
        }
        if (this.picker.datePicked.length === 2) {
            if (this.picker.options.autoApply) {
                this.setDateRange(this.picker.datePicked[0], this.picker.datePicked[1]);
                this.picker.trigger('select', { start: this.picker.getStartDate(), end: this.picker.getEndDate() });
                this.picker.hide();
            }
            else {
                this.hideTooltip();
                this.picker.renderAll();
            }
        }
    };
    BookingPlugin.prototype.onClickApplyButton = function (element) {
        if (this.picker.isApplyButton(element)) {
            if (this.picker.datePicked.length === 1 && !this.options.strict) {
                if (this.picker.options.element === this.triggerElement) {
                    this.options.endDate = null;
                    this.setStartDate(this.picker.datePicked[0]);
                }
                if (this.options.elementEnd === this.triggerElement) {
                    this.options.startDate = null;
                    this.setEndDate(this.picker.datePicked[0]);
                }
            }
            if (this.picker.datePicked.length === 2) {
                this.setDateRange(this.picker.datePicked[0], this.picker.datePicked[1]);
            }
            this.picker.trigger('select', { start: this.picker.getStartDate(), end: this.picker.getEndDate() });
            this.picker.hide();
        }
    };
    /**
     * Displays tooltip of selected days
     *
     * @param element
     * @param text
     */
    BookingPlugin.prototype.showTooltip = function (element, text) {
        this.tooltipElement.style.visibility = 'visible';
        this.tooltipElement.innerHTML = text;
        var container = this.picker.ui.container.getBoundingClientRect();
        var tooltip = this.tooltipElement.getBoundingClientRect();
        var day = element.getBoundingClientRect();
        var top = day.top;
        var left = day.left;
        top -= container.top;
        left -= container.left;
        top -= tooltip.height;
        left -= tooltip.width / 2;
        left += day.width / 2;
        this.tooltipElement.style.top = "".concat(top, "px");
        this.tooltipElement.style.left = "".concat(left, "px");
    };
    /**
     * Hide tooltip
     */
    BookingPlugin.prototype.hideTooltip = function () {
        this.tooltipElement.style.visibility = 'hidden';
    };
    /**
     * Determines if the locale option contains all required plurals
     */
    BookingPlugin.prototype.checkIntlPluralLocales = function () {
        if (!this.options.tooltip)
            return;
        var rules = __spreadArray([], new Set([
            new Intl.PluralRules(this.picker.options.lang).select(0),
            new Intl.PluralRules(this.picker.options.lang).select(1),
            new Intl.PluralRules(this.picker.options.lang).select(2),
            new Intl.PluralRules(this.picker.options.lang).select(6),
            new Intl.PluralRules(this.picker.options.lang).select(18),
        ]), true);
        var locales = Object.keys(this.options.locale);
        if (!rules.every(function (x) { return locales.includes(x); })) {
            console.warn("".concat(this.getName(), ": provide locales (").concat(rules.join(', '), ") for correct tooltip text."));
        }
    };
    return BookingPlugin;
}(base_plugin_1.BasePlugin));
exports.BookingPlugin = BookingPlugin;
