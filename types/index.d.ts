import { BasePlugin, IPlugin } from '@easepick/base-plugin';
import { IBookingConfig } from './interface';
import './index.scss';
export declare class BookingPlugin extends BasePlugin implements IPlugin {
    tooltipElement: HTMLElement;
    triggerElement: HTMLElement;
    private bookingsConverter;
    private bookings;
    private pendingBookings;
    private bookingsImpossibleDates;
    private selectForward;
    private selectBackward;
    binds: {
        setStartDate: any;
        setEndDate: any;
        setDateRange: any;
        getStartDate: any;
        getEndDate: any;
        onView: any;
        onShow: any;
        onMouseEnter: any;
        onClickCalendarDay: any;
        onClickApplyButton: any;
        parseValues: any;
        updateValues: any;
        clear: any;
    };
    options: IBookingConfig;
    /**
     * Returns plugin name
     *
     * @returns String
     */
    getName(): string;
    /**
     * - Called automatically via BasePlugin.attach() -
     * The function execute on initialize the picker
     */
    onAttach(): void;
    private getBookingsImpossibleDates;
    private getDatesBetween;
    /**
     * - Called automatically via BasePlugin.detach() -
     */
    onDetach(): void;
    /**
     * Parse `startDate`, `endDate` options or value of input elements
     */
    private parseValues;
    /**
     * Update value of input element
     */
    private updateValues;
    /**
     * Clear selection
     */
    private clear;
    /**
     * Function `show` event
     *
     * @param event
     */
    private onShow;
    private onMainView;
    private onCalendarHeaderView;
    private updateCalendarDayRangedView;
    private updateCalendarDayBookedView;
    private updateCalendarDayBookedViewWithBookings;
    private isTargetAvailable;
    private dateMatchesBookingStartDate;
    private dateMatchesBookingEndDate;
    private dateMatchesPendingBookingStartDate;
    private dateMatchesPendingBookingEndDate;
    private dateMatchesPendingBookingDate;
    private lockCalendarMinDays;
    private lockCalendarMinDaysWithBookings;
    private onCalendarDayView;
    private updateCalendarDayRangedViewWithBookings;
    private getMinBookingDate;
    private getPreviousBookingEndDate;
    private getMaxBookingDate;
    private getNextBookingEndDate;
    private lockCalendarMaxDays;
    private onFooterView;
    /**
     * Function `view` event
     * Adds HTML layout of current plugin to the picker layout
     *
     * @param event
     */
    private onView;
    /**
     * Function for documentClick option
     * Allows the picker to close when the user clicks outside
     *
     * @param e
     */
    private hidePicker;
    /**
     * Set startDate programmatically
     *
     * @param date
     */
    private setStartDate;
    /**
     * Set endDate programmatically
     *
     * @param date
     */
    private setEndDate;
    /**
     * Set date range programmatically
     *
     * @param start
     * @param end
     */
    private setDateRange;
    /**
     *
     * @returns DateTime
     */
    private getStartDate;
    /**
     *
     * @returns
     */
    private getEndDate;
    /**
     * Handle `filter` option
     *
     * @param date
     * @returns Boolean
     */
    private testFilter;
    /**
     * Checks availability date
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    private dateIsNotAvailable;
    private dateIsAlreadyBooked;
    /**
     * Handle `minDate` option
     *
     * @param date
     * @returns Boolean
     */
    private lockMinDate;
    /**
     * Handle `maxDate` option
     *
     * @param date
     * @returns Boolean
     */
    private lockMaxDate;
    /**
     * Handle `minDays` option
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    private lockMinDays;
    /**
     * Handle `maxDays` option
     *
     * @param date
     * @param start
     * @returns Boolean
     */
    private lockMaxDays;
    /**
     * Handle `selectForward` option
     *
     * @param date
     * @returns Boolean
     */
    private lockSelectForward;
    /**
     * Handle `selectBackward` option
     *
     * @param date
     * @returns Boolean
     */
    private lockSelectBackward;
    /**
     * Handle `mouseenter` event
     *
     * @param event
     */
    private onMouseEnter;
    /**
     * Handle `mouseleave` event
     *
     * @param event
     */
    private onClickCalendarDay;
    private onClickApplyButton;
    /**
     * Displays tooltip of selected days
     *
     * @param element
     * @param text
     */
    private showTooltip;
    /**
     * Hide tooltip
     */
    private hideTooltip;
    /**
     * Determines if the locale option contains all required plurals
     */
    private checkIntlPluralLocales;
}
