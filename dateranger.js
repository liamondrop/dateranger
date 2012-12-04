(function ($) {
    'use strict';

    var fnName = 'dateranger', FN;

    FN = function (element, options) {
        this.options = $.extend({},
            this.defaults = {
                days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                dateSeparator: ' to ',
                sep: '-',
                minDate: '',
                maxDate: '',
                startDate: '',
                endDate: '',
                numCalendars: 2,
                startDay: 0
        }, options);

        this.$el = $(element);
        this.$parent = this.$el.parent();
        this.$container = $(this.template.container).hide();
        this.$el.after(this.$container);
        this.fixDays();
        this.listen();
    };

    FN.prototype = {
        template: {
            container : '<div id="' + fnName + '-container"></div>',

            calendar: [
                '<table class="' + fnName + '-table">',
                    '<caption>',
                        '<span class="prev" title="Previous"><i class="caret caret-left"></i></span>',
                        '<span class="next" title="Next"><i class="caret caret-right"></i></span>',
                        '<span class="' + fnName + '-month"></span>',
                    '</caption>',
                    '<thead><tr></tr></thead>',
                    '<tbody></tbody>',
                '</table>'
            ].join('\n'),

            tr: '<tr></tr>',
            th: '<th></th>',
            td: '<td></td>',
            time: '<time></time>',
            abbr: '<abbr></abbr>'
        },

        fixDays: function () {
            for (var i = 0, opts = this.options, s = opts.startDay; i < s; i += 1) {
                opts.days.push(opts.days.shift());
            }
        },

        listen: function () {
            var that = this;
            this.$el.on('click', $.proxy(this.actuate, this))
                    .on('dr.reveal', $.proxy(this.reveal, this))
                    .on('dr.conceal', $.proxy(this.conceal, this));

            // close calendar on external click or 'esc' key
            $('html').on('click keyup', function (e) {
                var $target = $(e.target),
                    $parents = $target.parents(),
                    $table = $target.closest('.' + fnName + '-table');

                // return undefined if clicking within calendar.
                // note: clicking the next / prev buttons reveals
                // a mysteriously incomplete dom tree extending
                // only as far as the parent table. thus...
                if (that.$parent.is($parents) ||
                    $table.is($parents)) {
                    return;
                }
                if ((e.type === 'keyup' && e.keyCode === 27) ||
                    e.type === 'click') {
                    that.$el.trigger('dr.conceal');
                }
            });
        },

        actuate: function () {
          var drEvent = this.$container.is(':visible') ? 'dr.conceal' : 'dr.reveal';
          this.$el.trigger(drEvent);
          return false;
        },

        reveal: function () {
            var dateText = this.$el.text(),
                startDate, endDate, dateRange;

            if (!dateText) {
                startDate = new Date();
                endDate = new Date();
                dateRange = {
                    startDate: startDate,
                    endDate: endDate.setMonth(startDate.getMonth() + 1)
                }
            } else {
                dateRange = this.parseRange(dateText);
            }

            this.$parent.addClass('open');
            this.$container
                .append(this.generateCalendar(dateRange.startDate))
                .append(this.generateCalendar(dateRange.endDate))
                .fadeIn();
        },

        conceal: function () {
            var that = this;
            this.$container.fadeOut(function () {
                $(this).empty();
                this.$parent.removeClass('open');
            });
        },

        generateCalendar: function (selectedDate) {
            var $calendar = $(this.template.calendar),
                workDate =  new Date(selectedDate),
                workDay;

            workDate.setDate(1);
            workDay = workDate.getDay();
            while (workDay !== this.options.startDay) {
                workDate.setDate(workDate.getDate() - 1);
                workDay = (workDay > 0) ? workDay - 1 : 6;
            }

            this.renderHeader($calendar, selectedDate);
            this.renderBody($calendar, workDate, selectedDate);
            this.handleDateClick($calendar);
            return $calendar;
        },

        renderHeader: function ($calendar, date) {
            var opts = this.options,
                days = opts.days,
                temp = this.template,
                $month = $calendar.find('.' + fnName + '-month'),
                $next = $calendar.find('.next'),
                $prev = $calendar.find('.prev'),
                $headerRow = $calendar.find('thead tr'),
                $abbr, $th,
                i, l = days.length;

            for (i = 0; i < l; i += 1) {
                $abbr = $(temp.abbr).attr('title', days[i]).html(days[i].substring(0, 1));
                $th = $(temp.th).append($abbr);
                $headerRow.append($th);
            }

            $month.html(opts.months[date.getMonth()] + ' ' + date.getFullYear());
            $next.on('click', { date: date, direction: 'next' }, $.proxy(this.shiftMonth, this));
            $prev.on('click', { date: date, direction: 'previous' }, $.proxy(this.shiftMonth, this));
        },

        renderBody: function ($calendar, workDate, selectedDate) {
            var temp = this.template,
                ariaSelected,
                $time, $cell,
                $row = $(temp.tr),
                $body = $calendar.find('tbody');
            while (true) {
                $time = $(temp.time).attr('datetime', this.dateString(workDate)).html(workDate.getDate());
                $cell = $(temp.td).append($time);
                ariaSelected = false;

                if ((workDate.getDate() === selectedDate.getDate()) && workDate.getMonth() === selectedDate.getMonth()) {
                    ariaSelected = true;
                }

                if (workDate.getMonth() !== selectedDate.getMonth()) {
                    $cell.attr('aria-disabled', "true");
                } else {
                    $cell.attr('aria-disabled', "false");
                }

                $cell.attr('aria-selected', ariaSelected);
                $row.append($cell);
                workDate.setDate(workDate.getDate() + 1);

                if (workDate.getDay() === this.options.startDay) {
                    $body.append($row);
                    $row = $(temp.tr);
                    if (workDate.getMonth() !== selectedDate.getMonth()) {
                        break;
                    }
                }
            }
        },

        handleDateClick: function ($calendar) {
            var that = this;
            $calendar.find('[aria-disabled="false"]').on('click', function () {
                var $this = $(this),
                    $thisTable = $this.closest('.' + fnName + '-table'),
                    $tables = that.$container.children('table'),
                    startDate, endDate;
                $thisTable.find('[aria-selected="true"]').attr('aria-selected', 'false');
                $this.attr("aria-selected", "true");
                startDate = $tables.first().find('[aria-selected="true"] time').attr('datetime');
                endDate = $tables.last().find('[aria-selected="true"] time').attr('datetime');
                that.$el.text(startDate + that.options.dateSeparator + endDate);
                that.$el.trigger('dr.selected', { startDate: startDate, endDate: endDate });
            });
        },

        shiftMonth: function (e) {
            var $target = $(e.currentTarget),
                $table = $target.closest('.' + fnName + '-table'),
                direction = e.data.direction,
                shift = direction === 'next' ? 1 : -1,
                newDate = new Date();
            newDate.setMonth(e.data.date.getMonth() + shift);
            $table.replaceWith(this.generateCalendar(newDate));
        },

        dateString: function (date) {
            var pad = function (num, size) {
                    var s = "000000000" + num;
                    return s.substr(s.length - size);
                };
            return [date.getFullYear(),
                    pad(date.getMonth() + 1, 2),
                    pad(date.getDate(), 2)].join(this.options.sep);
        },        

        parseRange: function (rangeString) {
            var rangeArray = rangeString.split(this.options.dateSeparator),
                startDate = new Date(rangeArray[0].split(this.options.sep)),
                endDate  = new Date(rangeArray[1].split(this.options.sep));
            return { startDate : startDate, endDate : endDate };
        }
    };

    // jQuery plugin definition
    $.fn[fnName] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + fnName)) {
                $.data(this, 'plugin_' + fnName, new FN(this, options));
            }
        });
    };
}(jQuery));