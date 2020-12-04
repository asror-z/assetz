/*!
FullCalendar Scheduler v5.0.0
Docs & License: https://fullcalendar.io/scheduler
(c) 2020 Adam Shaw
*/
import './main.css';

import { config, createFormatter, greatestDurationDenominator, isSingleDay, createDuration, wholeDivideDurations, asRoughMs, addDays, startOfDay, padStart, asRoughSeconds, asRoughMinutes, diffWholeDays, isInt, computeVisibleDayRange, memoizeObjArg, buildClassNameNormalizer, getDateMeta, getSlotClassNames, getDayClassNames, buildNavLinkData, createElement, MountHook, BaseComponent, ContentHook, Fragment, createRef, NowTimer, NowIndicatorRoot, findElements, RenderHook, rangeContainsMarker, PositionCache, findDirectChildren, RefMap, isElVisible, multiplyDuration, buildEventRangeKey, BgEvent, getSegMeta, renderFill, intersectRanges, addMs, Slicer, StandardEvent, sortEventSegs, memoize, mapHash, DateComponent, getStickyHeaderDates, getStickyFooterScrollbar, ViewRoot, renderScrollShim, createPlugin } from '@fullcalendar/common';
import premiumCommonPlugin from '@fullcalendar/premium-common';
import { __extends, __assign } from 'tslib';
import { ScrollGrid } from '@fullcalendar/scrollgrid';

var MIN_AUTO_LABELS = 18; // more than `12` months but less that `24` hours
var MAX_AUTO_SLOTS_PER_LABEL = 6; // allows 6 10-min slots in an hour
var MAX_AUTO_CELLS = 200; // allows 4-days to have a :30 slot duration
config.MAX_TIMELINE_SLOTS = 1000;
// potential nice values for slot-duration and interval-duration
var STOCK_SUB_DURATIONS = [
    { years: 1 },
    { months: 1 },
    { days: 1 },
    { hours: 1 },
    { minutes: 30 },
    { minutes: 15 },
    { minutes: 10 },
    { minutes: 5 },
    { minutes: 1 },
    { seconds: 30 },
    { seconds: 15 },
    { seconds: 10 },
    { seconds: 5 },
    { seconds: 1 },
    { milliseconds: 500 },
    { milliseconds: 100 },
    { milliseconds: 10 },
    { milliseconds: 1 }
];
function buildTimelineDateProfile(dateProfile, dateEnv, allOptions, dateProfileGenerator) {
    var tDateProfile = {
        labelInterval: allOptions.slotLabelInterval,
        slotDuration: allOptions.slotDuration
    };
    validateLabelAndSlot(tDateProfile, dateProfile, dateEnv); // validate after computed grid duration
    ensureLabelInterval(tDateProfile, dateProfile, dateEnv);
    ensureSlotDuration(tDateProfile, dateProfile, dateEnv);
    var input = allOptions.slotLabelFormat;
    var rawFormats = Array.isArray(input) ? input :
        (input != null) ? [input] :
            computeHeaderFormats(tDateProfile, dateProfile, dateEnv, allOptions);
    tDateProfile.headerFormats = rawFormats.map(function (rawFormat) {
        return createFormatter(rawFormat);
    });
    tDateProfile.isTimeScale = Boolean(tDateProfile.slotDuration.milliseconds);
    var largeUnit = null;
    if (!tDateProfile.isTimeScale) {
        var slotUnit = greatestDurationDenominator(tDateProfile.slotDuration).unit;
        if (/year|month|week/.test(slotUnit)) {
            largeUnit = slotUnit;
        }
    }
    tDateProfile.largeUnit = largeUnit;
    tDateProfile.emphasizeWeeks =
        isSingleDay(tDateProfile.slotDuration) &&
            currentRangeAs('weeks', dateProfile, dateEnv) >= 2 &&
            !allOptions.businessHours;
    /*
    console.log('label interval =', timelineView.labelInterval.humanize())
    console.log('slot duration =', timelineView.slotDuration.humanize())
    console.log('header formats =', timelineView.headerFormats)
    console.log('isTimeScale', timelineView.isTimeScale)
    console.log('largeUnit', timelineView.largeUnit)
    */
    var rawSnapDuration = allOptions.snapDuration;
    var snapDuration;
    var snapsPerSlot;
    if (rawSnapDuration) {
        snapDuration = createDuration(rawSnapDuration);
        snapsPerSlot = wholeDivideDurations(tDateProfile.slotDuration, snapDuration);
        // ^ TODO: warning if not whole?
    }
    if (snapsPerSlot == null) {
        snapDuration = tDateProfile.slotDuration;
        snapsPerSlot = 1;
    }
    tDateProfile.snapDuration = snapDuration;
    tDateProfile.snapsPerSlot = snapsPerSlot;
    // more...
    var timeWindowMs = asRoughMs(dateProfile.slotMaxTime) - asRoughMs(dateProfile.slotMinTime);
    // TODO: why not use normalizeRange!?
    var normalizedStart = normalizeDate(dateProfile.renderRange.start, tDateProfile, dateEnv);
    var normalizedEnd = normalizeDate(dateProfile.renderRange.end, tDateProfile, dateEnv);
    // apply slotMinTime/slotMaxTime
    // TODO: View should be responsible.
    if (tDateProfile.isTimeScale) {
        normalizedStart = dateEnv.add(normalizedStart, dateProfile.slotMinTime);
        normalizedEnd = dateEnv.add(addDays(normalizedEnd, -1), dateProfile.slotMaxTime);
    }
    tDateProfile.timeWindowMs = timeWindowMs;
    tDateProfile.normalizedRange = { start: normalizedStart, end: normalizedEnd };
    var slotDates = [];
    var date = normalizedStart;
    while (date < normalizedEnd) {
        if (isValidDate(date, tDateProfile, dateProfile, dateProfileGenerator)) {
            slotDates.push(date);
        }
        date = dateEnv.add(date, tDateProfile.slotDuration);
    }
    tDateProfile.slotDates = slotDates;
    // more...
    var snapIndex = -1;
    var snapDiff = 0; // index of the diff :(
    var snapDiffToIndex = [];
    var snapIndexToDiff = [];
    date = normalizedStart;
    while (date < normalizedEnd) {
        if (isValidDate(date, tDateProfile, dateProfile, dateProfileGenerator)) {
            snapIndex++;
            snapDiffToIndex.push(snapIndex);
            snapIndexToDiff.push(snapDiff);
        }
        else {
            snapDiffToIndex.push(snapIndex + 0.5);
        }
        date = dateEnv.add(date, tDateProfile.snapDuration);
        snapDiff++;
    }
    tDateProfile.snapDiffToIndex = snapDiffToIndex;
    tDateProfile.snapIndexToDiff = snapIndexToDiff;
    tDateProfile.snapCnt = snapIndex + 1; // is always one behind
    tDateProfile.slotCnt = tDateProfile.snapCnt / tDateProfile.snapsPerSlot;
    // more...
    tDateProfile.isWeekStarts = buildIsWeekStarts(tDateProfile, dateEnv);
    tDateProfile.cellRows = buildCellRows(tDateProfile, dateEnv);
    tDateProfile.slotsPerLabel = wholeDivideDurations(tDateProfile.labelInterval, tDateProfile.slotDuration);
    return tDateProfile;
}
/*
snaps to appropriate unit
*/
function normalizeDate(date, tDateProfile, dateEnv) {
    var normalDate = date;
    if (!tDateProfile.isTimeScale) {
        normalDate = startOfDay(normalDate);
        if (tDateProfile.largeUnit) {
            normalDate = dateEnv.startOf(normalDate, tDateProfile.largeUnit);
        }
    }
    return normalDate;
}
/*
snaps to appropriate unit
*/
function normalizeRange(range, tDateProfile, dateEnv) {
    if (!tDateProfile.isTimeScale) {
        range = computeVisibleDayRange(range);
        if (tDateProfile.largeUnit) {
            var dayRange = range; // preserve original result
            range = {
                start: dateEnv.startOf(range.start, tDateProfile.largeUnit),
                end: dateEnv.startOf(range.end, tDateProfile.largeUnit)
            };
            // if date is partially through the interval, or is in the same interval as the start,
            // make the exclusive end be the *next* interval
            if (range.end.valueOf() !== dayRange.end.valueOf() || range.end <= range.start) {
                range = {
                    start: range.start,
                    end: dateEnv.add(range.end, tDateProfile.slotDuration)
                };
            }
        }
    }
    return range;
}
function isValidDate(date, tDateProfile, dateProfile, dateProfileGenerator) {
    if (dateProfileGenerator.isHiddenDay(date)) {
        return false;
    }
    else if (tDateProfile.isTimeScale) {
        // determine if the time is within slotMinTime/slotMaxTime, which may have wacky values
        var day = startOfDay(date);
        var timeMs = date.valueOf() - day.valueOf();
        var ms = timeMs - asRoughMs(dateProfile.slotMinTime); // milliseconds since slotMinTime
        ms = ((ms % 86400000) + 86400000) % 86400000; // make negative values wrap to 24hr clock
        return ms < tDateProfile.timeWindowMs; // before the slotMaxTime?
    }
    else {
        return true;
    }
}
function validateLabelAndSlot(tDateProfile, dateProfile, dateEnv) {
    var currentRange = dateProfile.currentRange;
    // make sure labelInterval doesn't exceed the max number of cells
    if (tDateProfile.labelInterval) {
        var labelCnt = dateEnv.countDurationsBetween(currentRange.start, currentRange.end, tDateProfile.labelInterval);
        if (labelCnt > config.MAX_TIMELINE_SLOTS) {
            console.warn('slotLabelInterval results in too many cells');
            tDateProfile.labelInterval = null;
        }
    }
    // make sure slotDuration doesn't exceed the maximum number of cells
    if (tDateProfile.slotDuration) {
        var slotCnt = dateEnv.countDurationsBetween(currentRange.start, currentRange.end, tDateProfile.slotDuration);
        if (slotCnt > config.MAX_TIMELINE_SLOTS) {
            console.warn('slotDuration results in too many cells');
            tDateProfile.slotDuration = null;
        }
    }
    // make sure labelInterval is a multiple of slotDuration
    if (tDateProfile.labelInterval && tDateProfile.slotDuration) {
        var slotsPerLabel = wholeDivideDurations(tDateProfile.labelInterval, tDateProfile.slotDuration);
        if (slotsPerLabel === null || slotsPerLabel < 1) {
            console.warn('slotLabelInterval must be a multiple of slotDuration');
            tDateProfile.slotDuration = null;
        }
    }
}
function ensureLabelInterval(tDateProfile, dateProfile, dateEnv) {
    var currentRange = dateProfile.currentRange;
    var labelInterval = tDateProfile.labelInterval;
    if (!labelInterval) {
        // compute based off the slot duration
        // find the largest label interval with an acceptable slots-per-label
        var input = void 0;
        if (tDateProfile.slotDuration) {
            for (var _i = 0, STOCK_SUB_DURATIONS_1 = STOCK_SUB_DURATIONS; _i < STOCK_SUB_DURATIONS_1.length; _i++) {
                input = STOCK_SUB_DURATIONS_1[_i];
                var tryLabelInterval = createDuration(input);
                var slotsPerLabel = wholeDivideDurations(tryLabelInterval, tDateProfile.slotDuration);
                if (slotsPerLabel !== null && slotsPerLabel <= MAX_AUTO_SLOTS_PER_LABEL) {
                    labelInterval = tryLabelInterval;
                    break;
                }
            }
            // use the slot duration as a last resort
            if (!labelInterval) {
                labelInterval = tDateProfile.slotDuration;
            }
            // compute based off the view's duration
            // find the largest label interval that yields the minimum number of labels
        }
        else {
            for (var _a = 0, STOCK_SUB_DURATIONS_2 = STOCK_SUB_DURATIONS; _a < STOCK_SUB_DURATIONS_2.length; _a++) {
                input = STOCK_SUB_DURATIONS_2[_a];
                labelInterval = createDuration(input);
                var labelCnt = dateEnv.countDurationsBetween(currentRange.start, currentRange.end, labelInterval);
                if (labelCnt >= MIN_AUTO_LABELS) {
                    break;
                }
            }
        }
        tDateProfile.labelInterval = labelInterval;
    }
    return labelInterval;
}
function ensureSlotDuration(tDateProfile, dateProfile, dateEnv) {
    var currentRange = dateProfile.currentRange;
    var slotDuration = tDateProfile.slotDuration;
    if (!slotDuration) {
        var labelInterval = ensureLabelInterval(tDateProfile, dateProfile, dateEnv); // will compute if necessary
        // compute based off the label interval
        // find the largest slot duration that is different from labelInterval, but still acceptable
        for (var _i = 0, STOCK_SUB_DURATIONS_3 = STOCK_SUB_DURATIONS; _i < STOCK_SUB_DURATIONS_3.length; _i++) {
            var input = STOCK_SUB_DURATIONS_3[_i];
            var trySlotDuration = createDuration(input);
            var slotsPerLabel = wholeDivideDurations(labelInterval, trySlotDuration);
            if (slotsPerLabel !== null && slotsPerLabel > 1 && slotsPerLabel <= MAX_AUTO_SLOTS_PER_LABEL) {
                slotDuration = trySlotDuration;
                break;
            }
        }
        // only allow the value if it won't exceed the view's # of slots limit
        if (slotDuration) {
            var slotCnt = dateEnv.countDurationsBetween(currentRange.start, currentRange.end, slotDuration);
            if (slotCnt > MAX_AUTO_CELLS) {
                slotDuration = null;
            }
        }
        // use the label interval as a last resort
        if (!slotDuration) {
            slotDuration = labelInterval;
        }
        tDateProfile.slotDuration = slotDuration;
    }
    return slotDuration;
}
function computeHeaderFormats(tDateProfile, dateProfile, dateEnv, allOptions) {
    var format1;
    var format2;
    var labelInterval = tDateProfile.labelInterval;
    var unit = greatestDurationDenominator(labelInterval).unit;
    var weekNumbersVisible = allOptions.weekNumbers;
    var format0 = (format1 = (format2 = null));
    // NOTE: weekNumber computation function wont work
    if ((unit === 'week') && !weekNumbersVisible) {
        unit = 'day';
    }
    switch (unit) {
        case 'year':
            format0 = { year: 'numeric' }; // '2015'
            break;
        case 'month':
            if (currentRangeAs('years', dateProfile, dateEnv) > 1) {
                format0 = { year: 'numeric' }; // '2015'
            }
            format1 = { month: 'short' }; // 'Jan'
            break;
        case 'week':
            if (currentRangeAs('years', dateProfile, dateEnv) > 1) {
                format0 = { year: 'numeric' }; // '2015'
            }
            format1 = { week: 'narrow' }; // 'Wk4'
            break;
        case 'day':
            if (currentRangeAs('years', dateProfile, dateEnv) > 1) {
                format0 = { year: 'numeric', month: 'long' }; // 'January 2014'
            }
            else if (currentRangeAs('months', dateProfile, dateEnv) > 1) {
                format0 = { month: 'long' }; // 'January'
            }
            if (weekNumbersVisible) {
                format1 = { week: 'short' }; // 'Wk 4'
            }
            format2 = { weekday: 'narrow', day: 'numeric' }; // 'Su 9'
            break;
        case 'hour':
            if (weekNumbersVisible) {
                format0 = { week: 'short' }; // 'Wk 4'
            }
            if (currentRangeAs('days', dateProfile, dateEnv) > 1) {
                format1 = { weekday: 'short', day: 'numeric', month: 'numeric', omitCommas: true }; // Sat 4/7
            }
            format2 = {
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: true,
                meridiem: 'short'
            };
            break;
        case 'minute':
            // sufficiently large number of different minute cells?
            if ((asRoughMinutes(labelInterval) / 60) >= MAX_AUTO_SLOTS_PER_LABEL) {
                format0 = {
                    hour: 'numeric',
                    meridiem: 'short'
                };
                format1 = function (params) {
                    return ':' + padStart(params.date.minute, 2); // ':30'
                };
            }
            else {
                format0 = {
                    hour: 'numeric',
                    minute: 'numeric',
                    meridiem: 'short'
                };
            }
            break;
        case 'second':
            // sufficiently large number of different second cells?
            if ((asRoughSeconds(labelInterval) / 60) >= MAX_AUTO_SLOTS_PER_LABEL) {
                format0 = { hour: 'numeric', minute: '2-digit', meridiem: 'lowercase' }; // '8:30 PM'
                format1 = function (params) {
                    return ':' + padStart(params.date.second, 2); // ':30'
                };
            }
            else {
                format0 = { hour: 'numeric', minute: '2-digit', second: '2-digit', meridiem: 'lowercase' }; // '8:30:45 PM'
            }
            break;
        case 'millisecond':
            format0 = { hour: 'numeric', minute: '2-digit', second: '2-digit', meridiem: 'lowercase' }; // '8:30:45 PM'
            format1 = function (params) {
                return '.' + padStart(params.millisecond, 3);
            };
            break;
    }
    return [].concat(format0 || [], format1 || [], format2 || []);
}
// Compute the number of the give units in the "current" range.
// Won't go more precise than days.
// Will return `0` if there's not a clean whole interval.
function currentRangeAs(unit, dateProfile, dateEnv) {
    var range = dateProfile.currentRange;
    var res = null;
    if (unit === 'years') {
        res = dateEnv.diffWholeYears(range.start, range.end);
    }
    else if (unit === 'months') {
        res = dateEnv.diffWholeMonths(range.start, range.end);
    }
    else if (unit === 'weeks') {
        res = dateEnv.diffWholeMonths(range.start, range.end);
    }
    else if (unit === 'days') {
        res = diffWholeDays(range.start, range.end);
    }
    return res || 0;
}
function buildIsWeekStarts(tDateProfile, dateEnv) {
    var slotDates = tDateProfile.slotDates, emphasizeWeeks = tDateProfile.emphasizeWeeks;
    var prevWeekNumber = null;
    var isWeekStarts = [];
    for (var _i = 0, slotDates_1 = slotDates; _i < slotDates_1.length; _i++) {
        var slotDate = slotDates_1[_i];
        var weekNumber = dateEnv.computeWeekNumber(slotDate);
        var isWeekStart = emphasizeWeeks && (prevWeekNumber !== null) && (prevWeekNumber !== weekNumber);
        prevWeekNumber = weekNumber;
        isWeekStarts.push(isWeekStart);
    }
    return isWeekStarts;
}
function buildCellRows(tDateProfile, dateEnv) {
    var slotDates = tDateProfile.slotDates;
    var formats = tDateProfile.headerFormats;
    var cellRows = formats.map(function (format) { return []; }); // indexed by row,col
    // specifically for navclicks
    var rowUnits = formats.map(function (format) {
        return format.getLargestUnit ? format.getLargestUnit() : null;
    });
    // builds cellRows and slotCells
    for (var i = 0; i < slotDates.length; i++) {
        var date = slotDates[i];
        var isWeekStart = tDateProfile.isWeekStarts[i];
        for (var row = 0; row < formats.length; row++) {
            var format = formats[row];
            var rowCells = cellRows[row];
            var leadingCell = rowCells[rowCells.length - 1];
            var isSuperRow = (formats.length > 1) && (row < (formats.length - 1)); // more than one row and not the last
            var newCell = null;
            if (isSuperRow) {
                var text = dateEnv.format(date, format);
                if (!leadingCell || (leadingCell.text !== text)) {
                    newCell = buildCellObject(date, text, rowUnits[row]);
                }
                else {
                    leadingCell.colspan += 1;
                }
            }
            else {
                if (!leadingCell ||
                    isInt(dateEnv.countDurationsBetween(tDateProfile.normalizedRange.start, date, tDateProfile.labelInterval))) {
                    var text = dateEnv.format(date, format);
                    newCell = buildCellObject(date, text, rowUnits[row]);
                }
                else {
                    leadingCell.colspan += 1;
                }
            }
            if (newCell) {
                newCell.weekStart = isWeekStart;
                rowCells.push(newCell);
            }
        }
    }
    return cellRows;
}
function buildCellObject(date, text, rowUnit) {
    return { date: date, text: text, rowUnit: rowUnit, colspan: 1, isWeekStart: false };
}

var TimelineHeaderTh = /** @class */ (function (_super) {
    __extends(TimelineHeaderTh, _super);
    function TimelineHeaderTh() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.refineHookProps = memoizeObjArg(refineHookProps);
        _this.normalizeClassNames = buildClassNameNormalizer();
        return _this;
    }
    TimelineHeaderTh.prototype.render = function () {
        var _a = this, props = _a.props, context = _a.context;
        var dateEnv = context.dateEnv, options = context.options;
        var cell = props.cell, dateProfile = props.dateProfile, tDateProfile = props.tDateProfile;
        // the cell.rowUnit is f'd
        // giving 'month' for a 3-day view
        // workaround: to infer day, do NOT time
        var dateMeta = getDateMeta(cell.date, props.todayRange, props.nowDate, dateProfile);
        var classNames = ['fc-timeline-slot', 'fc-timeline-slot-label'].concat(cell.rowUnit === 'time' // TODO: so slot classnames for week/month/bigger. see note above about rowUnit
            ? getSlotClassNames(dateMeta, context.theme)
            : getDayClassNames(dateMeta, context.theme));
        if (cell.isWeekStart) {
            classNames.push('fc-timeline-slot-em');
        }
        var navLinkData = (options.navLinks && cell.rowUnit && cell.rowUnit !== 'time')
            ? buildNavLinkData(cell.date, cell.rowUnit)
            : null;
        var hookProps = this.refineHookProps({
            dateMarker: cell.date,
            text: cell.text,
            dateEnv: context.dateEnv,
            viewApi: context.viewApi
        });
        var customClassNames = this.normalizeClassNames(options.slotLabelClassNames, hookProps);
        return (createElement(MountHook, { hookProps: hookProps, didMount: options.slotLabelDidMount, willUnmount: options.slotLabelWillUnmount }, function (rootElRef) { return (createElement("th", { ref: rootElRef, className: classNames.concat(customClassNames).join(' '), "data-date": dateEnv.formatIso(cell.date, { omitTime: !tDateProfile.isTimeScale, omitTimeZoneOffset: true }), colSpan: cell.colspan },
            createElement("div", { className: 'fc-timeline-slot-frame', style: { height: props.rowInnerHeight } },
                createElement(TimelineHeaderThInner, { hookProps: hookProps, isSticky: props.isSticky, navLinkData: navLinkData })))); }));
    };
    return TimelineHeaderTh;
}(BaseComponent));
var TimelineHeaderThInner = /** @class */ (function (_super) {
    __extends(TimelineHeaderThInner, _super);
    function TimelineHeaderThInner() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineHeaderThInner.prototype.render = function () {
        var _a = this, props = _a.props, context = _a.context;
        var navLinkAttrs = props.navLinkData
            ? { 'data-navlink': props.navLinkData, tabIndex: 0 }
            : {};
        return (createElement(ContentHook, { hookProps: props.hookProps, content: context.options.slotLabelContent, defaultContent: renderInnerContent }, function (innerElRef, innerContent) { return (createElement("a", __assign({ ref: innerElRef, className: 'fc-timeline-slot-cushion fc-scrollgrid-sync-inner' + (props.isSticky ? ' fc-sticky' : '') }, navLinkAttrs), innerContent)); }));
    };
    return TimelineHeaderThInner;
}(BaseComponent));
function renderInnerContent(props) {
    return props.text;
}
function refineHookProps(input) {
    return {
        date: input.dateEnv.toDate(input.dateMarker),
        view: input.viewApi,
        text: input.text
    };
}

var TimelineHeaderRows = /** @class */ (function (_super) {
    __extends(TimelineHeaderRows, _super);
    function TimelineHeaderRows() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineHeaderRows.prototype.render = function () {
        var _a = this.props, dateProfile = _a.dateProfile, tDateProfile = _a.tDateProfile, rowInnerHeights = _a.rowInnerHeights, todayRange = _a.todayRange, nowDate = _a.nowDate;
        var cellRows = tDateProfile.cellRows;
        return (createElement(Fragment, null, cellRows.map(function (rowCells, i) {
            var isLast = i === cellRows.length - 1;
            var isChrono = tDateProfile.isTimeScale && isLast; // the final row, with times?
            var classNames = [
                'fc-timeline-header-row',
                isChrono ? 'fc-timeline-header-row-chrono' : ''
            ];
            return (createElement("tr", { key: i, className: classNames.join(' ') }, rowCells.map(function (cell) { return (createElement(TimelineHeaderTh, { key: cell.date.toISOString(), cell: cell, dateProfile: dateProfile, tDateProfile: tDateProfile, todayRange: todayRange, nowDate: nowDate, rowInnerHeight: rowInnerHeights && rowInnerHeights[i], isSticky: !isLast })); })));
        })));
    };
    return TimelineHeaderRows;
}(BaseComponent));

var TimelineHeader = /** @class */ (function (_super) {
    __extends(TimelineHeader, _super);
    function TimelineHeader() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.rootElRef = createRef();
        return _this;
    }
    TimelineHeader.prototype.render = function () {
        var _this = this;
        var _a = this, props = _a.props, context = _a.context;
        // TODO: very repetitive
        // TODO: make part of tDateProfile?
        var timerUnit = greatestDurationDenominator(props.tDateProfile.slotDuration).unit;
        return (createElement(NowTimer, { unit: timerUnit }, function (nowDate, todayRange) { return (createElement("div", { className: 'fc-timeline-header', ref: _this.rootElRef },
            createElement("table", { className: 'fc-scrollgrid-sync-table', style: { minWidth: props.tableMinWidth, width: props.clientWidth } },
                props.tableColGroupNode,
                createElement("tbody", null,
                    createElement(TimelineHeaderRows, { dateProfile: props.dateProfile, tDateProfile: props.tDateProfile, nowDate: nowDate, todayRange: todayRange, rowInnerHeights: props.rowInnerHeights }))),
            (context.options.nowIndicator && props.slatCoords && props.slatCoords.isDateInRange(nowDate)) &&
                createElement(NowIndicatorRoot, { isAxis: true, date: nowDate }, function (rootElRef, classNames, innerElRef, innerContent) { return (createElement("div", { ref: rootElRef, className: ['fc-timeline-now-indicator-arrow'].concat(classNames).join(' '), style: { left: props.slatCoords.dateToCoord(nowDate) } }, innerContent)); }))); }));
    };
    TimelineHeader.prototype.componentDidMount = function () {
        this.updateSize();
    };
    TimelineHeader.prototype.componentDidUpdate = function () {
        this.updateSize();
    };
    TimelineHeader.prototype.updateSize = function () {
        if (this.props.onMaxCushionWidth) {
            this.props.onMaxCushionWidth(this.computeMaxCushionWidth());
        }
    };
    TimelineHeader.prototype.computeMaxCushionWidth = function () {
        return Math.max.apply(Math, findElements(this.rootElRef.current, '.fc-timeline-header-row:last-child .fc-timeline-slot-cushion').map(function (el) { return el.getBoundingClientRect().width; }));
    };
    return TimelineHeader;
}(BaseComponent));

var TimelineSlatCell = /** @class */ (function (_super) {
    __extends(TimelineSlatCell, _super);
    function TimelineSlatCell() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineSlatCell.prototype.render = function () {
        var _a = this, props = _a.props, context = _a.context;
        var dateEnv = context.dateEnv, options = context.options, theme = context.theme;
        var date = props.date, tDateProfile = props.tDateProfile, isEm = props.isEm;
        var dateMeta = getDateMeta(props.date, props.todayRange, props.nowDate, props.dateProfile);
        var classNames = ['fc-timeline-slot', 'fc-timeline-slot-lane'];
        var dataAttrs = { 'data-date': dateEnv.formatIso(date, { omitTimeZoneOffset: true, omitTime: !tDateProfile.isTimeScale }) };
        var hookProps = __assign(__assign({ date: dateEnv.toDate(props.date) }, dateMeta), { view: context.viewApi });
        if (isEm) {
            classNames.push('fc-timeline-slot-em');
        }
        if (tDateProfile.isTimeScale) {
            classNames.push(isInt(dateEnv.countDurationsBetween(tDateProfile.normalizedRange.start, props.date, tDateProfile.labelInterval)) ?
                'fc-timeline-slot-major' :
                'fc-timeline-slot-minor');
        }
        classNames.push.apply(classNames, (props.isDay
            ? getDayClassNames(dateMeta, theme)
            : getSlotClassNames(dateMeta, theme)));
        return (createElement(RenderHook, { hookProps: hookProps, classNames: options.slotLaneClassNames, content: options.slotLaneContent, didMount: options.slotLaneDidMount, willUnmount: options.slotLaneWillUnmount, elRef: props.elRef }, function (rootElRef, customClassNames, innerElRef, innerContent) { return (createElement("td", __assign({ ref: rootElRef, className: classNames.concat(customClassNames).join(' ') }, dataAttrs),
            createElement("div", { ref: innerElRef }, innerContent))); }));
    };
    return TimelineSlatCell;
}(BaseComponent));

var TimelineCoords = /** @class */ (function () {
    function TimelineCoords(slatRootEl, // okay to expose?
    slatEls, dateProfile, tDateProfile, dateEnv, isRtl) {
        this.slatRootEl = slatRootEl;
        this.dateProfile = dateProfile;
        this.tDateProfile = tDateProfile;
        this.dateEnv = dateEnv;
        this.isRtl = isRtl;
        this.outerCoordCache = new PositionCache(slatRootEl, slatEls, true, // isHorizontal
        false // isVertical
        );
        // for the inner divs within the slats
        // used for event rendering and scrollTime, to disregard slat border
        this.innerCoordCache = new PositionCache(slatRootEl, findDirectChildren(slatEls, 'div'), true, // isHorizontal
        false // isVertical
        );
    }
    TimelineCoords.prototype.rangeToCoords = function (range) {
        if (this.isRtl) {
            return { right: this.dateToCoord(range.start), left: this.dateToCoord(range.end) };
        }
        else {
            return { left: this.dateToCoord(range.start), right: this.dateToCoord(range.end) };
        }
    };
    TimelineCoords.prototype.isDateInRange = function (date) {
        return rangeContainsMarker(this.dateProfile.currentRange, date);
    };
    // for LTR, results range from 0 to width of area
    // for RTL, results range from negative width of area to 0
    TimelineCoords.prototype.dateToCoord = function (date) {
        var tDateProfile = this.tDateProfile;
        var snapCoverage = this.computeDateSnapCoverage(date);
        var slotCoverage = snapCoverage / tDateProfile.snapsPerSlot;
        var slotIndex = Math.floor(slotCoverage);
        slotIndex = Math.min(slotIndex, tDateProfile.slotCnt - 1);
        var partial = slotCoverage - slotIndex;
        var _a = this, innerCoordCache = _a.innerCoordCache, outerCoordCache = _a.outerCoordCache;
        if (this.isRtl) {
            return (outerCoordCache.rights[slotIndex] -
                (innerCoordCache.getWidth(slotIndex) * partial)) - outerCoordCache.originClientRect.width;
        }
        else {
            return (outerCoordCache.lefts[slotIndex] +
                (innerCoordCache.getWidth(slotIndex) * partial));
        }
    };
    // returned value is between 0 and the number of snaps
    TimelineCoords.prototype.computeDateSnapCoverage = function (date) {
        return computeDateSnapCoverage(date, this.tDateProfile, this.dateEnv);
    };
    TimelineCoords.prototype.computeDurationLeft = function (duration) {
        var _a = this, dateProfile = _a.dateProfile, dateEnv = _a.dateEnv, isRtl = _a.isRtl;
        var left = 0;
        if (dateProfile) {
            left = this.dateToCoord(dateEnv.add(startOfDay(dateProfile.activeRange.start), // startOfDay needed?
            duration));
            // hack to overcome the left borders of non-first slat
            if (!isRtl && left) {
                left += 1;
            }
        }
        return left;
    };
    return TimelineCoords;
}());
// returned value is between 0 and the number of snaps
function computeDateSnapCoverage(date, tDateProfile, dateEnv) {
    var snapDiff = dateEnv.countDurationsBetween(tDateProfile.normalizedRange.start, date, tDateProfile.snapDuration);
    if (snapDiff < 0) {
        return 0;
    }
    else if (snapDiff >= tDateProfile.snapDiffToIndex.length) {
        return tDateProfile.snapCnt;
    }
    else {
        var snapDiffInt = Math.floor(snapDiff);
        var snapCoverage = tDateProfile.snapDiffToIndex[snapDiffInt];
        if (isInt(snapCoverage)) { // not an in-between value
            snapCoverage += snapDiff - snapDiffInt; // add the remainder
        }
        else {
            // a fractional value, meaning the date is not visible
            // always round up in this case. works for start AND end dates in a range.
            snapCoverage = Math.ceil(snapCoverage);
        }
        return snapCoverage;
    }
}

var TimelineSlats = /** @class */ (function (_super) {
    __extends(TimelineSlats, _super);
    function TimelineSlats() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.rootElRef = createRef();
        _this.cellElRefs = new RefMap();
        _this.handleScrollRequest = function (request) {
            var onScrollLeftRequest = _this.props.onScrollLeftRequest;
            var coords = _this.coords;
            if (onScrollLeftRequest && coords) {
                if (request.time) {
                    var scrollLeft = coords.computeDurationLeft(request.time);
                    onScrollLeftRequest(scrollLeft);
                }
                return true;
            }
        };
        return _this;
    }
    TimelineSlats.prototype.render = function () {
        var _a = this, props = _a.props, context = _a.context;
        return (createElement("div", { className: 'fc-timeline-slots', ref: this.rootElRef },
            createElement("table", { className: context.theme.getClass('table'), style: {
                    minWidth: props.tableMinWidth,
                    width: props.clientWidth
                } },
                props.tableColGroupNode,
                createElement(TimelineSlatsBody, { cellElRefs: this.cellElRefs, dateProfile: props.dateProfile, tDateProfile: props.tDateProfile, nowDate: props.nowDate, todayRange: props.todayRange }))));
    };
    TimelineSlats.prototype.componentDidMount = function () {
        this.updateSizing();
        this.scrollResponder = this.context.createScrollResponder(this.handleScrollRequest);
    };
    TimelineSlats.prototype.componentDidUpdate = function (prevProps) {
        this.updateSizing();
        this.scrollResponder.update(prevProps.dateProfile !== this.props.dateProfile);
    };
    TimelineSlats.prototype.componentWillUnmount = function () {
        this.scrollResponder.detach();
        if (this.props.onCoords) {
            this.props.onCoords(null);
        }
    };
    TimelineSlats.prototype.updateSizing = function () {
        var _a = this, props = _a.props, context = _a.context;
        if (props.clientWidth !== null && // is sizing stable?
            this.scrollResponder // it's possible to have clientWidth immediately after mount (when returning from print view), but w/o scrollResponder
        ) {
            var rootEl = this.rootElRef.current;
            if (isElVisible(rootEl)) { // not hidden by css
                this.coords = new TimelineCoords(this.rootElRef.current, collectCellEls(this.cellElRefs.currentMap, props.tDateProfile.slotDates), props.dateProfile, props.tDateProfile, context.dateEnv, context.isRtl);
                if (props.onCoords) {
                    props.onCoords(this.coords);
                }
                this.scrollResponder.update(false); // TODO: wouldn't have to do this if coords were in state
            }
        }
    };
    TimelineSlats.prototype.positionToHit = function (leftPosition) {
        var outerCoordCache = this.coords.outerCoordCache;
        var _a = this.context, dateEnv = _a.dateEnv, isRtl = _a.isRtl;
        var tDateProfile = this.props.tDateProfile;
        var slatIndex = outerCoordCache.leftToIndex(leftPosition);
        if (slatIndex != null) {
            // somewhat similar to what TimeGrid does. consolidate?
            var slatWidth = outerCoordCache.getWidth(slatIndex);
            var partial = isRtl ?
                (outerCoordCache.rights[slatIndex] - leftPosition) / slatWidth :
                (leftPosition - outerCoordCache.lefts[slatIndex]) / slatWidth;
            var localSnapIndex = Math.floor(partial * tDateProfile.snapsPerSlot);
            var start = dateEnv.add(tDateProfile.slotDates[slatIndex], multiplyDuration(tDateProfile.snapDuration, localSnapIndex));
            var end = dateEnv.add(start, tDateProfile.snapDuration);
            return {
                dateSpan: {
                    range: { start: start, end: end },
                    allDay: !this.props.tDateProfile.isTimeScale
                },
                dayEl: this.cellElRefs.currentMap[slatIndex],
                left: outerCoordCache.lefts[slatIndex],
                right: outerCoordCache.rights[slatIndex]
            };
        }
        return null;
    };
    return TimelineSlats;
}(BaseComponent));
var TimelineSlatsBody = /** @class */ (function (_super) {
    __extends(TimelineSlatsBody, _super);
    function TimelineSlatsBody() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineSlatsBody.prototype.render = function () {
        var props = this.props;
        var tDateProfile = props.tDateProfile, cellElRefs = props.cellElRefs;
        var slotDates = tDateProfile.slotDates, isWeekStarts = tDateProfile.isWeekStarts;
        var isDay = !tDateProfile.isTimeScale && !tDateProfile.largeUnit;
        return (createElement("tbody", null,
            createElement("tr", null, slotDates.map(function (slotDate, i) {
                var key = slotDate.toISOString();
                return (createElement(TimelineSlatCell, { key: key, elRef: cellElRefs.createRef(key), date: slotDate, dateProfile: props.dateProfile, tDateProfile: tDateProfile, nowDate: props.nowDate, todayRange: props.todayRange, isEm: isWeekStarts[i], isDay: isDay }));
            }))));
    };
    return TimelineSlatsBody;
}(BaseComponent));
function collectCellEls(elMap, slotDates) {
    return slotDates.map(function (slotDate) {
        var key = slotDate.toISOString();
        return elMap[key];
    });
}

var TimelineLaneBg = /** @class */ (function (_super) {
    __extends(TimelineLaneBg, _super);
    function TimelineLaneBg() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineLaneBg.prototype.render = function () {
        var props = this.props;
        var highlightSeg = [].concat(props.eventResizeSegs, props.dateSelectionSegs);
        return props.timelineCoords && (createElement("div", { className: 'fc-timeline-bg' },
            this.renderSegs(props.businessHourSegs || [], props.timelineCoords, 'non-business'),
            this.renderSegs(props.bgEventSegs || [], props.timelineCoords, 'bg-event'),
            this.renderSegs(highlightSeg, props.timelineCoords, 'highlight')));
    };
    TimelineLaneBg.prototype.renderSegs = function (segs, timelineCoords, fillType) {
        var _a = this.props, todayRange = _a.todayRange, nowDate = _a.nowDate;
        var children = segs.map(function (seg) {
            var coords = timelineCoords.rangeToCoords(seg); // seg has { start, end }
            return (createElement("div", { key: buildEventRangeKey(seg.eventRange), className: 'fc-timeline-bg-harness', style: {
                    left: coords.left,
                    right: -coords.right // outwards from right edge (which is same as left edge)
                } }, fillType === 'bg-event' ?
                createElement(BgEvent, __assign({ seg: seg }, getSegMeta(seg, todayRange, nowDate))) :
                renderFill(fillType)));
        });
        return createElement(Fragment, null, children);
    };
    return TimelineLaneBg;
}(BaseComponent));

var TimelineLaneSlicer = /** @class */ (function (_super) {
    __extends(TimelineLaneSlicer, _super);
    function TimelineLaneSlicer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineLaneSlicer.prototype.sliceRange = function (origRange, dateProfile, dateProfileGenerator, tDateProfile, dateEnv) {
        var normalRange = normalizeRange(origRange, tDateProfile, dateEnv);
        var segs = [];
        // protect against when the span is entirely in an invalid date region
        if (computeDateSnapCoverage(normalRange.start, tDateProfile, dateEnv) < computeDateSnapCoverage(normalRange.end, tDateProfile, dateEnv)) {
            // intersect the footprint's range with the grid's range
            var slicedRange = intersectRanges(normalRange, tDateProfile.normalizedRange);
            if (slicedRange) {
                segs.push({
                    start: slicedRange.start,
                    end: slicedRange.end,
                    isStart: slicedRange.start.valueOf() === normalRange.start.valueOf() && isValidDate(slicedRange.start, tDateProfile, dateProfile, dateProfileGenerator),
                    isEnd: slicedRange.end.valueOf() === normalRange.end.valueOf() && isValidDate(addMs(slicedRange.end, -1), tDateProfile, dateProfile, dateProfileGenerator)
                });
            }
        }
        return segs;
    };
    return TimelineLaneSlicer;
}(Slicer));

var DEFAULT_TIME_FORMAT = createFormatter({
    hour: 'numeric',
    minute: '2-digit',
    omitZeroMinute: true,
    meridiem: 'narrow'
});
var TimelineEvent = /** @class */ (function (_super) {
    __extends(TimelineEvent, _super);
    function TimelineEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimelineEvent.prototype.render = function () {
        var props = this.props;
        return (createElement(StandardEvent, __assign({}, props, { extraClassNames: ['fc-timeline-event', 'fc-h-event'], defaultTimeFormat: DEFAULT_TIME_FORMAT, defaultDisplayEventTime: !props.isTimeScale })));
    };
    return TimelineEvent;
}(BaseComponent));

function computeSegHorizontals(segs, timelineCoords) {
    var horizontals = {};
    if (timelineCoords) {
        for (var _i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
            var seg = segs_1[_i];
            var instanceId = seg.eventRange.instance.instanceId;
            horizontals[instanceId] = timelineCoords.rangeToCoords(seg); // seg has { start, end }
        }
    }
    return horizontals;
}
function computeSegVerticals(segs, eventOrderSpecs, dimHash) {
    var placements = []; // sorted by top
    var maxBottom = 0;
    if (dimHash) { // protection for if dims not computed yet
        segs = sortEventSegs(segs, eventOrderSpecs);
        for (var _i = 0, segs_2 = segs; _i < segs_2.length; _i++) {
            var seg = segs_2[_i];
            var key = seg.eventRange.instance.instanceId;
            var dims = dimHash[key];
            if (dims) { // MORE protection
                var top_1 = 0;
                var insertI = 0; // where to start searching for an insert position
                for (var i = 0; i < placements.length; i++) { // loop through existing placements
                    var placement = placements[i];
                    if (testCollide(dims, top_1, placement.dims, placement.top)) {
                        top_1 = placement.top + placement.dims.height;
                        insertI = i;
                    }
                }
                // move insertI along to be after the placement whos top is below the current top
                while (insertI < placements.length && top_1 >= placements[insertI].top) {
                    insertI++;
                }
                placements.splice(insertI, 0, { key: key, dims: dims, top: top_1 }); // insert
                maxBottom = Math.max(maxBottom, top_1 + dims.height);
            }
        }
    }
    var topHash = {};
    for (var _a = 0, placements_1 = placements; _a < placements_1.length; _a++) {
        var placement = placements_1[_a];
        topHash[placement.key] = placement.top;
    }
    return { segTops: topHash, height: maxBottom };
}
function testCollide(dims0, top0, dims1, top1) {
    return dims0.right > dims1.left &&
        dims0.left < dims1.right &&
        top0 + dims0.height > top1 &&
        top0 < top1 + dims1.height;
}

var TimelineLane = /** @class */ (function (_super) {
    __extends(TimelineLane, _super);
    function TimelineLane() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.slicer = new TimelineLaneSlicer();
        _this.computeFgSegHorizontals = memoize(computeSegHorizontals); // only for fg event segs, not mirror
        _this.computeSegVerticals = memoize(computeSegVerticals);
        _this.harnessElRefs = new RefMap();
        _this.innerElRef = createRef();
        _this.state = {
            segDims: null
        };
        return _this;
    }
    TimelineLane.prototype.render = function () {
        var _a = this, props = _a.props, state = _a.state, context = _a.context;
        var dateProfile = props.dateProfile, tDateProfile = props.tDateProfile;
        var slicedProps = this.slicer.sliceProps(props, dateProfile, tDateProfile.isTimeScale ? null : props.nextDayThreshold, context, // wish we didn't have to pass in the rest of the args...
        dateProfile, context.dateProfileGenerator, tDateProfile, context.dateEnv);
        var mirrorSegs = (slicedProps.eventDrag ? slicedProps.eventDrag.segs : null) ||
            (slicedProps.eventResize ? slicedProps.eventResize.segs : null) ||
            [];
        var segHorizontals = this.computeFgSegHorizontals(slicedProps.fgEventSegs, props.timelineCoords); // ONLY for non-mirror. needed?
        var _b = this.computeSegVerticals(slicedProps.fgEventSegs, context.options.eventOrder, state.segDims), segTops = _b.segTops, height = _b.height;
        var hiddenSegs = // TODO: more convenient
         (slicedProps.eventDrag ? slicedProps.eventDrag.affectedInstances : null) ||
            (slicedProps.eventResize ? slicedProps.eventResize.affectedInstances : null) ||
            {};
        return (createElement(Fragment, null,
            createElement(TimelineLaneBg, { businessHourSegs: slicedProps.businessHourSegs, bgEventSegs: slicedProps.bgEventSegs, timelineCoords: props.timelineCoords, eventResizeSegs: slicedProps.eventResize ? slicedProps.eventResize.segs : [] /* bad new empty array? */, dateSelectionSegs: slicedProps.dateSelectionSegs, nowDate: props.nowDate, todayRange: props.todayRange }),
            createElement("div", { className: 'fc-timeline-events fc-scrollgrid-sync-inner', ref: this.innerElRef, style: { height: height /* computed by computeSegVerticals */ } },
                this.renderFgSegs(slicedProps.fgEventSegs, segHorizontals, segTops, hiddenSegs, false, false, false),
                this.renderFgSegs(mirrorSegs, computeSegHorizontals(mirrorSegs, props.timelineCoords), // not memoized
                segTops, // reuse same tops for mirror
                {}, Boolean(slicedProps.eventDrag), Boolean(slicedProps.eventResize), false // because mirror is never drawn for date selection
                ))));
    };
    TimelineLane.prototype.componentDidMount = function () {
        this.updateSize();
    };
    TimelineLane.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevProps.eventStore !== this.props.eventStore ||
            prevProps.timelineCoords !== this.props.timelineCoords
        // won't trigger on a segDims change
        ) {
            this.updateSize();
        }
    };
    TimelineLane.prototype.updateSize = function () {
        var _this = this;
        var props = this.props;
        var timelineCoords = props.timelineCoords;
        if (props.onHeightChange) {
            props.onHeightChange(this.innerElRef.current, false);
        }
        if (timelineCoords) {
            var originRect_1 = timelineCoords.slatRootEl.getBoundingClientRect();
            this.setState({
                segDims: mapHash(this.harnessElRefs.currentMap, function (harnessEl) {
                    var harnessRect = harnessEl.getBoundingClientRect();
                    return {
                        left: harnessRect.left - originRect_1.left,
                        right: harnessRect.right - originRect_1.left,
                        height: harnessRect.height
                    };
                })
            }, function () {
                if (props.onHeightChange) {
                    props.onHeightChange(_this.innerElRef.current, true);
                }
            });
        }
    };
    TimelineLane.prototype.renderFgSegs = function (segs, segHorizontals, segTops, hiddenSegs, isDragging, isResizing, isDateSelecting) {
        var _this = this;
        var _a = this, harnessElRefs = _a.harnessElRefs, props = _a.props;
        var isMirror = isDragging || isResizing || isDateSelecting;
        return (createElement(Fragment, null, segs.map(function (seg) {
            var instanceId = seg.eventRange.instance.instanceId;
            var horizontalCoords = segHorizontals[instanceId];
            var top = segTops[instanceId];
            return (createElement("div", { key: instanceId, ref: isMirror ? null : harnessElRefs.createRef(instanceId), className: 'fc-timeline-event-harness', style: {
                    left: horizontalCoords ? horizontalCoords.left : '',
                    right: horizontalCoords ? -horizontalCoords.right : '',
                    top: top != null ? top : '',
                    visibility: hiddenSegs[instanceId] ? 'hidden' : '' /* wtf, file @types/react bug */
                } },
                createElement(TimelineEvent, __assign({ isTimeScale: _this.props.tDateProfile.isTimeScale, seg: seg, isDragging: isDragging, isResizing: isResizing, isDateSelecting: isDateSelecting, isSelected: instanceId === _this.props.eventSelection /* TODO: bad for mirror? */ }, getSegMeta(seg, props.todayRange, props.nowDate)))));
        })));
    };
    return TimelineLane;
}(BaseComponent));

var TimelineGrid = /** @class */ (function (_super) {
    __extends(TimelineGrid, _super);
    function TimelineGrid() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.slatsRef = createRef();
        _this.state = {
            coords: null
        };
        _this.handeEl = function (el) {
            if (el) {
                _this.context.registerInteractiveComponent(_this, { el: el });
            }
            else {
                _this.context.unregisterInteractiveComponent(_this);
            }
        };
        _this.handleCoords = function (coords) {
            _this.setState({ coords: coords });
            if (_this.props.onSlatCoords) {
                _this.props.onSlatCoords(coords);
            }
        };
        return _this;
    }
    TimelineGrid.prototype.render = function () {
        var _this = this;
        var _a = this, props = _a.props, state = _a.state, context = _a.context;
        var options = context.options;
        var dateProfile = props.dateProfile, tDateProfile = props.tDateProfile;
        var timerUnit = greatestDurationDenominator(tDateProfile.slotDuration).unit;
        return (createElement("div", { className: 'fc-timeline-body', ref: this.handeEl, style: {
                minWidth: props.tableMinWidth,
                height: props.clientHeight,
                width: props.clientWidth
            } },
            createElement(NowTimer, { unit: timerUnit }, function (nowDate, todayRange) { return (createElement(Fragment, null,
                createElement(TimelineSlats, { ref: _this.slatsRef, dateProfile: dateProfile, tDateProfile: tDateProfile, nowDate: nowDate, todayRange: todayRange, clientWidth: props.clientWidth, tableColGroupNode: props.tableColGroupNode, tableMinWidth: props.tableMinWidth, onCoords: _this.handleCoords, onScrollLeftRequest: props.onScrollLeftRequest }),
                createElement(TimelineLane, { dateProfile: dateProfile, tDateProfile: props.tDateProfile, nowDate: nowDate, todayRange: todayRange, nextDayThreshold: options.nextDayThreshold, businessHours: props.businessHours, eventStore: props.eventStore, eventUiBases: props.eventUiBases, dateSelection: props.dateSelection, eventSelection: props.eventSelection, eventDrag: props.eventDrag, eventResize: props.eventResize, timelineCoords: state.coords }),
                (options.nowIndicator && state.coords && state.coords.isDateInRange(nowDate)) &&
                    createElement(NowIndicatorRoot, { isAxis: false, date: nowDate }, function (rootElRef, classNames, innerElRef, innerContent) { return (createElement("div", { ref: rootElRef, className: ['fc-timeline-now-indicator-line'].concat(classNames).join(' '), style: { left: state.coords.dateToCoord(nowDate) } }, innerContent)); }))); })));
    };
    // Hit System
    // ------------------------------------------------------------------------------------------
    TimelineGrid.prototype.queryHit = function (positionLeft, positionTop, elWidth, elHeight) {
        var slats = this.slatsRef.current;
        var slatHit = slats.positionToHit(positionLeft);
        if (slatHit) {
            return {
                component: this,
                dateSpan: slatHit.dateSpan,
                rect: {
                    left: slatHit.left,
                    right: slatHit.right,
                    top: 0,
                    bottom: elHeight
                },
                dayEl: slatHit.dayEl,
                layer: 0
            };
        }
    };
    return TimelineGrid;
}(DateComponent));

var TimelineView = /** @class */ (function (_super) {
    __extends(TimelineView, _super);
    function TimelineView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.buildTimelineDateProfile = memoize(buildTimelineDateProfile);
        _this.scrollGridRef = createRef();
        _this.state = {
            slatCoords: null,
            slotCushionMaxWidth: null
        };
        _this.handleSlatCoords = function (slatCoords) {
            _this.setState({ slatCoords: slatCoords });
        };
        _this.handleScrollLeftRequest = function (scrollLeft) {
            var scrollGrid = _this.scrollGridRef.current;
            scrollGrid.forceScrollLeft(0, scrollLeft);
        };
        _this.handleMaxCushionWidth = function (slotCushionMaxWidth) {
            _this.setState({
                slotCushionMaxWidth: Math.ceil(slotCushionMaxWidth) // for less rerendering TODO: DRY
            });
        };
        return _this;
    }
    TimelineView.prototype.render = function () {
        var _this = this;
        var _a = this, props = _a.props, state = _a.state, context = _a.context;
        var options = context.options;
        var stickyHeaderDates = !props.forPrint && getStickyHeaderDates(options);
        var stickyFooterScrollbar = !props.forPrint && getStickyFooterScrollbar(options);
        var tDateProfile = this.buildTimelineDateProfile(props.dateProfile, context.dateEnv, options, context.dateProfileGenerator);
        var extraClassNames = [
            'fc-timeline',
            options.eventOverlap === false ? 'fc-timeline-overlap-disabled' : ''
        ];
        var slotMinWidth = options.slotMinWidth;
        var slatCols = buildSlatCols(tDateProfile, slotMinWidth || this.computeFallbackSlotMinWidth(tDateProfile));
        var sections = [
            {
                type: 'header',
                key: 'header',
                isSticky: stickyHeaderDates,
                chunks: [{
                        key: 'timeline',
                        content: function (contentArg) { return (createElement(TimelineHeader, { dateProfile: props.dateProfile, clientWidth: contentArg.clientWidth, clientHeight: contentArg.clientHeight, tableMinWidth: contentArg.tableMinWidth, tableColGroupNode: contentArg.tableColGroupNode, tDateProfile: tDateProfile, slatCoords: state.slatCoords, onMaxCushionWidth: slotMinWidth ? null : _this.handleMaxCushionWidth })); }
                    }]
            },
            {
                type: 'body',
                key: 'body',
                liquid: true,
                chunks: [{
                        key: 'timeline',
                        content: function (contentArg) { return (createElement(TimelineGrid, __assign({}, props, { clientWidth: contentArg.clientWidth, clientHeight: contentArg.clientHeight, tableMinWidth: contentArg.tableMinWidth, tableColGroupNode: contentArg.tableColGroupNode, tDateProfile: tDateProfile, onSlatCoords: _this.handleSlatCoords, onScrollLeftRequest: _this.handleScrollLeftRequest }))); }
                    }]
            }
        ];
        if (stickyFooterScrollbar) {
            sections.push({
                type: 'footer',
                key: 'footer',
                isSticky: true,
                chunks: [{
                        key: 'timeline',
                        content: renderScrollShim
                    }]
            });
        }
        return (createElement(ViewRoot, { viewSpec: context.viewSpec }, function (rootElRef, classNames) { return (createElement("div", { ref: rootElRef, className: extraClassNames.concat(classNames).join(' ') },
            createElement(ScrollGrid, { ref: _this.scrollGridRef, liquid: !props.isHeightAuto && !props.forPrint, colGroups: [
                    { cols: slatCols }
                ], sections: sections }))); }));
    };
    TimelineView.prototype.computeFallbackSlotMinWidth = function (tDateProfile) {
        return Math.max(30, ((this.state.slotCushionMaxWidth || 0) / tDateProfile.slotsPerLabel));
    };
    return TimelineView;
}(DateComponent));
function buildSlatCols(tDateProfile, slotMinWidth) {
    return [{
            span: tDateProfile.slotCnt,
            minWidth: slotMinWidth || 1 // needs to be a non-zero number to trigger horizontal scrollbars!??????
        }];
}

var main = createPlugin({
    deps: [
        premiumCommonPlugin
    ],
    initialView: 'timelineDay',
    views: {
        timeline: {
            component: TimelineView,
            eventResizableFromStart: true // how is this consumed for TimelineView tho?
        },
        timelineDay: {
            type: 'timeline',
            duration: { days: 1 }
        },
        timelineWeek: {
            type: 'timeline',
            duration: { weeks: 1 }
        },
        timelineMonth: {
            type: 'timeline',
            duration: { months: 1 }
        },
        timelineYear: {
            type: 'timeline',
            duration: { years: 1 }
        }
    }
});

export default main;
export { TimelineCoords, TimelineHeader, TimelineHeaderRows, TimelineLane, TimelineLaneBg, TimelineLaneSlicer, TimelineSlats, TimelineView, buildSlatCols, buildTimelineDateProfile };
//# sourceMappingURL=main.js.map
