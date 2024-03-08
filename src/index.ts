import { DateTime } from '@easepick/datetime';
import { BasePlugin, IEventDetail, IPlugin } from '@easepick/base-plugin';
import {IBookingConfig, BookingsList } from './interface';
import './index.scss';
import {BookingsConverter} from "./bookings-converter";

export class BookingPlugin extends BasePlugin implements IPlugin {
  public tooltipElement: HTMLElement;
  public triggerElement: HTMLElement;

  private bookingsConverter: BookingsConverter = new BookingsConverter();
  private bookings: BookingsList;
  private pendingBookings: BookingsList;
  private bookingsImpossibleDates: DateTime[] = [];
  private selectForward: boolean;
  private selectBackward: boolean;

  public binds = {
    setStartDate: this.setStartDate.bind(this),
    setEndDate: this.setEndDate.bind(this),
    setDateRange: this.setDateRange.bind(this),
    getStartDate: this.getStartDate.bind(this),
    getEndDate: this.getEndDate.bind(this),
    onView: this.onView.bind(this),
    onShow: this.onShow.bind(this),
    onMouseEnter: this.onMouseEnter.bind(this),
    onClickCalendarDay: this.onClickCalendarDay.bind(this),
    onClickApplyButton: this.onClickApplyButton.bind(this),
    parseValues: this.parseValues.bind(this),
    updateValues: this.updateValues.bind(this),
    clear: this.clear.bind(this),
  };

  public options: IBookingConfig = {
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
    tooltipNumber: (num: number) => {
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
    documentClick: this.hidePicker.bind(this),
  };

  /**
   * Returns plugin name
   * 
   * @returns String
   */
  public getName(): string {
    return 'BookingPlugin';
  }

  /**
   * - Called automatically via BasePlugin.attach() -
   * The function execute on initialize the picker
   */
  public onAttach(): void {
    const pickerPlugins = this.picker.options.plugins;
    if (pickerPlugins.includes('RangePlugin') || pickerPlugins.includes('LockPlugin')) {
      throw new Error(
          'BookingPlugin can not be used with RangePlugin or LockPlugin as it is a combination of both'
      );
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
          .doc.querySelector(this.options.elementEnd) as HTMLElement;
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

      (this.options.elementEnd as HTMLElement).addEventListener('click', this.picker.show.bind(this.picker));
    }

    this.picker.options.date = null;

    this.bookings = this.bookingsConverter.convert(this.options.bookings);
    this.pendingBookings = this.bookingsConverter.convert(this.options.pendingBookings);
    this.bookingsImpossibleDates = this.getBookingsImpossibleDates();

    if (this.options.minDate) {
      this.options.minDate = new DateTime(
          this.options.minDate,
          this.picker.options.format,
          this.picker.options.lang,
      );
    }

    if (this.options.maxDate) {
      this.options.maxDate = new DateTime(
          this.options.maxDate,
          this.picker.options.format,
          this.picker.options.lang,
      );

      if (this.options.maxDate instanceof DateTime
          && this.picker.options.calendars > 1
          && this.picker.calendars[0].isSame(this.options.maxDate, 'month')) {
        const d = this.picker.calendars[0].clone().subtract(1, 'month');
        this.picker.gotoDate(d);
      }
    }

    this.picker.on('view', this.binds.onView);
    this.picker.on('show', this.binds.onShow);
    this.picker.on('mouseenter', this.binds.onMouseEnter, true);

    this.checkIntlPluralLocales();
  }

  private getBookingsImpossibleDates(): DateTime[] {
    if (!this.options.minDays) {
      return [];
    }

    const impossibleDates: DateTime[] = [];

    if (this.options.minDate) {
      const minDate = this.options.minDate instanceof DateTime
          ? this.options.minDate
          : new DateTime(this.options.minDate);
      const firstBooking = this.bookings[0] || null;

      if (firstBooking && firstBooking.from.isBefore(minDate.clone().add(this.options.minDays), 'day')) {
        impossibleDates.push(...this.getDatesBetween(minDate, firstBooking.from));
      }
    }

    this.bookings.forEach((booking, index) => {
      const nextBooking = this.bookings[index + 1] || null;

      if (nextBooking && nextBooking.from.isBefore(booking.to.clone().add(this.options.minDays, 'day'))) {
        impossibleDates.push(...this.getDatesBetween(booking.to, nextBooking.from));
      }
    });

    if (this.options.maxDate) {
      const maxDate = this.options.maxDate instanceof DateTime
          ? this.options.maxDate
          : new DateTime(this.options.maxDate);
      const lastBooking = this.bookings[0] || null;

      if (lastBooking && lastBooking.to.isBefore(maxDate.clone().add(this.options.minDays), 'day')) {
        impossibleDates.push(...this.getDatesBetween(lastBooking.to, maxDate));
      }
    }

    return impossibleDates;
  }

  private getDatesBetween(start: DateTime, end: DateTime): DateTime[] {
    const dates: DateTime[] = [];

    let date = start.clone();

    while (date.isSameOrBefore(end)) {
      dates.push(date.clone());
      date = date.clone().add(1, 'day');
    }

    return dates;
  }

  /**
   * - Called automatically via BasePlugin.detach() -
   */
  public onDetach(): void {
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
  }

  /**
   * Parse `startDate`, `endDate` options or value of input elements
   */
  private parseValues() {
    if (this.options.startDate || this.options.endDate) {
      if (this.options.strict) {
        if (this.options.startDate && this.options.endDate) {
          this.setDateRange(this.options.startDate, this.options.endDate);
        } else {
          this.options.startDate = null;
          this.options.endDate = null;
        }
      } else {
        if (this.options.startDate) {
          this.setStartDate(this.options.startDate)
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
      } else {
        if (this.picker.options.element instanceof HTMLInputElement
          && this.picker.options.element.value.length) {
          this.setStartDate(this.picker.options.element.value);
        }

        if (this.options.elementEnd instanceof HTMLInputElement
          && this.options.elementEnd.value.length) {
          this.setEndDate(this.options.elementEnd.value);
        }
      }
    } else if (this.picker.options.element instanceof HTMLInputElement && this.picker.options.element.value.length) {
      const [_start, _end] = this.picker.options.element.value.split(this.options.delimiter);

      if (this.options.strict) {
        if (_start && _end) {
          this.setDateRange(_start, _end);
        }
      } else {
        if (_start) this.setStartDate(_start);
        if (_end) this.setEndDate(_end);
      }
    }
  }

  /**
   * Update value of input element
   */
  private updateValues() {
    const el = this.picker.options.element;
    const elEnd = this.options.elementEnd;
    const start = this.picker.getStartDate();
    const end = this.picker.getEndDate();
    const startString = start instanceof Date
      ? start.format(this.picker.options.format, this.picker.options.lang)
      : '';
    const endString = end instanceof Date
      ? end.format(this.picker.options.format, this.picker.options.lang)
      : '';

    if (elEnd) {
      if (el instanceof HTMLInputElement) {
        el.value = startString;
      } else if (el instanceof HTMLElement) {
        el.innerText = startString;
      }

      if (elEnd instanceof HTMLInputElement) {
        elEnd.value = endString;
      } else if (elEnd instanceof HTMLElement) {
        elEnd.innerText = endString;
      }
    } else {
      const delimiter = startString || endString ? this.options.delimiter : '';
      const formatString = `${startString}${delimiter}${endString}`;

      if (el instanceof HTMLInputElement) {
        el.value = formatString;
      } else if (el instanceof HTMLElement) {
        el.innerText = formatString;
      }
    }
  }

  /**
   * Clear selection
   */
  private clear() {
    this.options.startDate = null;
    this.options.endDate = null;
    this.picker.datePicked.length = 0;
    this.updateValues();
    this.picker.renderAll();
    this.picker.trigger('clear');
  }

  /**
   * Function `show` event
   * 
   * @param event 
   */
  private onShow(event) {
    const { target }: IEventDetail = event.detail;
    this.triggerElement = target;

    if (this.picker.options.scrollToDate && this.getStartDate() instanceof Date) {
      this.picker.gotoDate(this.getStartDate());
    }
  }

  private onMainView(event: CustomEvent) {
    const { target }: IEventDetail = event.detail;

    this.tooltipElement = document.createElement('span');
    this.tooltipElement.className = 'booking-plugin-tooltip';
    target.appendChild(this.tooltipElement);
  }

  private onCalendarHeaderView(event: CustomEvent) {
    const { target, date }: IEventDetail = event.detail;

    if (this.options.minDate instanceof DateTime && date.isSameOrBefore(this.options.minDate, 'month')) {
      target.classList.add('no-previous-month');
    }

    if (this.options.maxDate instanceof DateTime && date.isSameOrAfter(this.options.maxDate, 'month')) {
      target.classList.add('no-next-month');
    }
  }

  private updateCalendarDayRangedView(target: HTMLElement, date: DateTime, start: DateTime, end: DateTime) {
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
  }

  private updateCalendarDayBookedView(target: HTMLElement, date: DateTime) {
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
  }

  private updateCalendarDayBookedViewWithBookings(target: HTMLElement, date: DateTime) {
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
  }

  private isTargetAvailable(target: HTMLElement): boolean {
    return !target.classList.contains('not-available')
        && !target.classList.contains('locked')
        && !target.classList.contains('pending');
  }

  private dateMatchesBookingStartDate(date: DateTime): boolean {
    return this.bookings.some(booking => booking.from.isSame(date, 'day'));
  }

  private dateMatchesBookingEndDate(date: DateTime): boolean {
    return this.bookings.some(booking => booking.to.isSame(date, 'day'));
  }

  private dateMatchesPendingBookingStartDate(date: DateTime): boolean {
    return this.pendingBookings.some(pendingBooking => pendingBooking.from.isSame(date, 'day'));
  }

  private dateMatchesPendingBookingEndDate(date: DateTime): boolean {
    return this.pendingBookings.some(pendingBooking => pendingBooking.to.isSame(date, 'day'));
  }

  private dateMatchesPendingBookingDate(date: DateTime): boolean {
    for (const pendingBooking of this.pendingBookings) {
      if (date.isBetween(pendingBooking.from, pendingBooking.to, '()')) {
        return true;
      }
    }

    return false;
  }

  private lockCalendarMinDays(target: HTMLElement, date: DateTime) {
    const date1 = date.clone().subtract(this.options.minDays - 1, 'day');
    const date2 = date.clone().add(this.options.minDays - 1, 'day');
    let lockedInPrevDays = false;
    let lockedInNextDays = false;

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
  }

  private lockCalendarMinDaysWithBookings(target: HTMLElement, date: DateTime) {
    if (this.bookingsImpossibleDates.find(impossibleDate => impossibleDate.isSame(date, 'day'))) {
      target.classList.add('not-available');
    }
  }

  private onCalendarDayView(event: CustomEvent) {
    const { target, date }: IEventDetail = event.detail;

    this.updateCalendarDayBookedView(target, date);

    const datePicked = this.picker.datePicked;
    const start = datePicked.length ? this.picker.datePicked[0] : this.getStartDate();
    const end = datePicked.length ? this.picker.datePicked[1] : this.getEndDate();

    this.updateCalendarDayRangedView(target, new DateTime(target.dataset.time), start, end);

    if (start && !end) {
      this.lockCalendarMaxDays(target, date, start);
      this.updateCalendarDayRangedViewWithBookings(target, date, start);
    }
  }

  private updateCalendarDayRangedViewWithBookings(target: HTMLElement, date: DateTime, start: DateTime) {
    const previousBookingEndDate = this.getMinBookingDate(start);
    if (previousBookingEndDate && date.isBefore(previousBookingEndDate, 'day')) {
      target.classList.add('not-available');

      return;
    }

    const nextBookingStartDate = this.getMaxBookingDate(start);
    if (nextBookingStartDate && date.isAfter(nextBookingStartDate, 'day')) {
      target.classList.add('not-available');

      return;
    }
  }

  private getMinBookingDate(date: DateTime): DateTime|null {
    const previousBookingEndDate = this.getPreviousBookingEndDate(date);
    const optionsMinDate = this.options.minDate instanceof DateTime ? this.options.minDate : null;

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
  }

  private getPreviousBookingEndDate(date: DateTime): DateTime|null {
    const bookings = this.bookings.filter(booking => booking.to.isSameOrBefore(date, 'day'));

    if (bookings.length) {
      return bookings[bookings.length - 1].to;
    }

    return null;
  }

  private getMaxBookingDate(date: DateTime): DateTime|null {
    const nextBookingEndDate = this.getNextBookingEndDate(date);
    const optionsMaxDate = this.options.maxDate instanceof DateTime ? this.options.maxDate : null;

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
  }

  private getNextBookingEndDate(date: DateTime): DateTime|null {
    const bookings = this.bookings.filter(booking => booking.from.isSameOrAfter(date, 'day'));

    if (bookings.length) {
      return bookings[0].from;
    }

    return null;
  }

  private lockCalendarMaxDays(target: HTMLElement, date: DateTime, start: DateTime) {
    if (this.lockMaxDays(date, start)) {
      target.classList.add('not-available');
    }
  }

  private onFooterView(event: CustomEvent) {
    const { target }: IEventDetail = event.detail;

    // RangePlugin
    const allowApplyBtn = (this.picker.datePicked.length === 1 && !this.options.strict)
        || this.picker.datePicked.length === 2;
    const applyButton = target.querySelector('.apply-button') as HTMLButtonElement;
    applyButton.disabled = !allowApplyBtn;
  }

  /**
   * Function `view` event
   * Adds HTML layout of current plugin to the picker layout
   * 
   * @param event 
   */
  private onView(event: CustomEvent) {
    const { view }: IEventDetail = event.detail;

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
  }

  /**
   * Function for documentClick option
   * Allows the picker to close when the user clicks outside
   * 
   * @param e 
   */
  private hidePicker(e) {
    let target = e.target;
    let host = null;

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
  }

  /**
   * Set startDate programmatically
   * 
   * @param date 
   */
  private setStartDate(date: Date | string | number) {
    const d = new DateTime(date, this.picker.options.format);
    this.options.startDate = d ? d.clone() : null;

    this.updateValues();

    this.picker.renderAll();
  }

  /**
   * Set endDate programmatically
   * 
   * @param date 
   */
  private setEndDate(date: Date | string | number) {
    const d = new DateTime(date, this.picker.options.format);
    this.options.endDate = d ? d.clone() : null;

    this.updateValues();

    this.picker.renderAll();
  }

  /**
   * Set date range programmatically
   * 
   * @param start 
   * @param end 
   */
  private setDateRange(start: Date | string | number, end: Date | string | number) {
    const startDate = new DateTime(start, this.picker.options.format);
    const endDate = new DateTime(end, this.picker.options.format);

    this.options.startDate = startDate ? startDate.clone() : null;
    this.options.endDate = endDate ? endDate.clone() : null;

    this.updateValues();

    this.picker.renderAll();
  }

  /**
   * 
   * @returns DateTime
   */
  private getStartDate(): DateTime {
    return this.options.startDate instanceof Date ? this.options.startDate.clone() : null;
  }

  /**
   * 
   * @returns 
   */
  private getEndDate(): DateTime {
    return this.options.endDate instanceof Date ? this.options.endDate.clone() : null;
  }

  /**
   * Handle `filter` option
   *
   * @param date
   * @returns Boolean
   */
  private testFilter(date: DateTime): boolean {
    return typeof this.options.filter === 'function'
        ? this.options.filter(date, this.picker.datePicked)
        : false;
  }

  /**
   * Checks availability date
   *
   * @param date
   * @param start
   * @returns Boolean
   */
  private dateIsNotAvailable(date: DateTime, start: DateTime): boolean {
    return this.lockMinDate(date)
        || this.lockMaxDate(date)
        || this.lockMinDays(date, start)
        || this.lockMaxDays(date, start)
        || this.lockSelectForward(date)
        || this.lockSelectBackward(date);
  }

  private dateIsAlreadyBooked(date: DateTime): boolean {
    for (const booking of this.bookings) {
      if (date.isBetween(booking.from, booking.to, '()')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle `minDate` option
   *
   * @param date
   * @returns Boolean
   */
  private lockMinDate(date: DateTime): boolean {
    return this.options.minDate instanceof DateTime
        ? date.isBefore(this.options.minDate, 'day')
        : false;
  }

  /**
   * Handle `maxDate` option
   *
   * @param date
   * @returns Boolean
   */
  private lockMaxDate(date: DateTime): boolean {
    return this.options.maxDate instanceof DateTime
        ? date.isAfter(this.options.maxDate, 'day')
        : false;
  }

  /**
   * Handle `minDays` option
   *
   * @param date
   * @param start
   * @returns Boolean
   */
  private lockMinDays(date: DateTime, start: DateTime): boolean {
    if (this.options.minDays && start) {
      const minPrev = start
          .clone()
          .subtract(this.options.minDays - 1, 'day');
      const minNext = start
          .clone()
          .add(this.options.minDays - 1, 'day');

      return date.isBetween(minPrev, minNext);
    }

    return false;
  }

  /**
   * Handle `maxDays` option
   *
   * @param date
   * @param start
   * @returns Boolean
   */
  private lockMaxDays(date: DateTime, start: DateTime): boolean {
    if (this.options.maxDays && start) {
      const maxPrev = start
          .clone()
          .subtract(this.options.maxDays, 'day');
      const maxNext = start
          .clone()
          .add(this.options.maxDays, 'day');

      return !date.isBetween(maxPrev, maxNext);
    }

    return false;
  }

  /**
   * Handle `selectForward` option
   *
   * @param date
   * @returns Boolean
   */
  private lockSelectForward(date: DateTime): boolean {
    if (this.picker.datePicked.length === 1 && this.selectForward) {
      const start = this.picker.datePicked[0].clone();

      return date.isBefore(start, 'day');
    }

    return false;
  }

  /**
   * Handle `selectBackward` option
   *
   * @param date
   * @returns Boolean
   */
  private lockSelectBackward(date: DateTime): boolean {
    if (this.picker.datePicked.length === 1 && this.selectBackward) {
      const start = this.picker.datePicked[0].clone();

      return date.isAfter(start, 'day');
    }

    return false;
  }

  /**
   * Handle `mouseenter` event
   * 
   * @param event 
   */
  private onMouseEnter(event) {
    const target = event.target;

    if (target instanceof HTMLElement) {
      const element = target.closest('.unit');

      if (!(element instanceof HTMLElement)) return;

      if (this.picker.isCalendarDay(element)) {
        if (this.picker.datePicked.length !== 1) return;

        let date1 = this.picker.datePicked[0].clone();
        let date2 = new DateTime(element.dataset.time);
        let isFlipped = false;

        if (date1.isAfter(date2, 'day')) {
          const tempDate = date1.clone();
          date1 = date2.clone();
          date2 = tempDate.clone();
          isFlipped = true;
        }

        const days = Array.from(this.picker.ui.container.querySelectorAll('.day'));

        days.forEach((d: HTMLElement) => {
          const date = new DateTime(d.dataset.time);
          const dayView = this.picker.Calendar.getCalendarDayView(date);

          if (date.isBetween(date1, date2)) {
            dayView.classList.add('in-range');
          }

          if (date.isSame(this.picker.datePicked[0], 'day')) {
            dayView.classList.add('start');
            dayView.classList.toggle('flipped', isFlipped);
          }

          if (d === element) {
            dayView.classList.add('end');
            dayView.classList.toggle('flipped', isFlipped);
          }

          d.className = dayView.className;
        });

        if (this.options.tooltip) {
          const diff = this.options.tooltipNumber(date2.diff(date1, 'day') + 1);

          if (diff > 0) {
            const pluralKey = new Intl.PluralRules(this.picker.options.lang).select(diff);
            const text = `${diff} ${this.options.locale[pluralKey]}`;

            this.showTooltip(element, text);
          } else {
            this.hideTooltip();
          }
        }
      }
    }
  }

  /**
   * Handle `mouseleave` event
   * 
   * @param event 
   */
  private onClickCalendarDay(element: HTMLElement) {
    if (!this.picker.isCalendarDay(element)) {
      return;
    }

    if (this.picker.datePicked.length === 2) {
      this.picker.datePicked.length = 0;
    }

    const date = new DateTime(element.dataset.time);
    this.picker.datePicked[this.picker.datePicked.length] = date;

    if (this.picker.datePicked.length === 2 && this.picker.datePicked[0].isAfter(this.picker.datePicked[1])) {
      const tempDate = this.picker.datePicked[1].clone();
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
      } else {
        this.hideTooltip();

        this.picker.renderAll();
      }
    }
  }

  private onClickApplyButton(element: HTMLElement) {
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
  }

  /**
   * Displays tooltip of selected days
   * 
   * @param element 
   * @param text 
   */
  private showTooltip(element: HTMLElement, text: string) {
    this.tooltipElement.style.visibility = 'visible';
    this.tooltipElement.innerHTML = text;

    const container = this.picker.ui.container.getBoundingClientRect();
    const tooltip = this.tooltipElement.getBoundingClientRect();
    const day = element.getBoundingClientRect();
    let top = day.top;
    let left = day.left;

    top -= container.top;
    left -= container.left;

    top -= tooltip.height;
    left -= tooltip.width / 2;
    left += day.width / 2;

    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip() {
    this.tooltipElement.style.visibility = 'hidden';
  }

  /**
   * Determines if the locale option contains all required plurals
   */
  private checkIntlPluralLocales() {
    if (!this.options.tooltip) return;

    const rules = [...new Set([
      new Intl.PluralRules(this.picker.options.lang).select(0),
      new Intl.PluralRules(this.picker.options.lang).select(1),
      new Intl.PluralRules(this.picker.options.lang).select(2),
      new Intl.PluralRules(this.picker.options.lang).select(6),
      new Intl.PluralRules(this.picker.options.lang).select(18),
    ])];

    const locales = Object.keys(this.options.locale);

    if (!rules.every(x => locales.includes(x))) {
      console.warn(`${this.getName()}: provide locales (${rules.join(', ')}) for correct tooltip text.`);
    }
  }
}
