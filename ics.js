// ics.js regular
// by nwcell (https://github.com/nwcell/ics.js)
// Modified for Berkeley Class Loader
// this was fixed for 6.7.3 to include timezones with Claude 4.0 (Approx. 20 lines changed)

var ics = function(uidDomain, prodId) {
  'use strict';

  if (navigator.userAgent.indexOf('MSIE') > -1 && navigator.userAgent.indexOf('MSIE 10') == -1) {
    console.log('Unsupported Browser');
    return;
  }

  if (typeof uidDomain === 'undefined') { uidDomain = 'default'; }
  if (typeof prodId === 'undefined') { prodId = 'BerkeleyClassLoader'; }

  var SEPARATOR = (navigator.appVersion.indexOf('Win') !== -1) ? '\r\n' : '\n';
  var calendarEvents = [];
  var calendarStart = [
    'BEGIN:VCALENDAR',
    'PRODID:' + prodId,
    'VERSION:2.0',
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'DTSTART:20070311T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'DTSTART:20071104T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join(SEPARATOR);
  var calendarEnd = SEPARATOR + 'END:VCALENDAR';
  var BYDAY_VALUES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // helper functions
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function formatDateTimeLocal(date) {
    var year = ("0000" + date.getFullYear().toString()).slice(-4);
    var month = ("00" + (date.getMonth() + 1).toString()).slice(-2);
    var day = ("00" + date.getDate().toString()).slice(-2);
    var hours = ("00" + date.getHours().toString()).slice(-2);
    var minutes = ("00" + date.getMinutes().toString()).slice(-2);
    var seconds = ("00" + date.getSeconds().toString()).slice(-2);
    return year + month + day + 'T' + hours + minutes + seconds;
  }

  function formatDateTimeUTC(date) {
    var year = ("0000" + date.getUTCFullYear().toString()).slice(-4);
    var month = ("00" + (date.getUTCMonth() + 1).toString()).slice(-2);
    var day = ("00" + date.getUTCDate().toString()).slice(-2);
    var hours = ("00" + date.getUTCHours().toString()).slice(-2);
    var minutes = ("00" + date.getUTCMinutes().toString()).slice(-2);
    var seconds = ("00" + date.getUTCSeconds().toString()).slice(-2);
    return year + month + day + 'T' + hours + minutes + seconds + 'Z';
  }

  return {
    /**
     * Returns events array
     * @return {array} Events
     */
    'events': function() {
      return calendarEvents;
    },

    /**
     * Returns calendar
     * @return {string} Calendar in iCalendar format
     */
    'calendar': function() {
      return calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;
    },

    /**
     * Add event to the calendar
     * @param  {string} subject     Subject/Title of event
     * @param  {string} description Description of event
     * @param  {string} location    Location of event
     * @param  {string} begin       Beginning date of event
     * @param  {string} stop        Ending date of event
     */
    'addEvent': function(subject, description, location, begin, stop, rrule) {
      // I'm not in the mood to make these optional... So they are all required
      if (typeof subject === 'undefined' ||
        typeof description === 'undefined' ||
        typeof location === 'undefined' ||
        typeof begin === 'undefined' ||
        typeof stop === 'undefined'
      ) {
        return false;
      }

      // validate rrule
      if (rrule) {
        if (!rrule.rrule) {
          if (rrule.freq !== 'YEARLY' && rrule.freq !== 'MONTHLY' && rrule.freq !== 'WEEKLY' && rrule.freq !== 'DAILY') {
            throw "Recurrence rrule frequency must be provided and be one of the following: 'YEARLY', 'MONTHLY', 'WEEKLY', or 'DAILY'";
          }

          if (rrule.until) {
            if (isNaN(Date.parse(rrule.until))) {
              throw "Recurrence rrule 'until' must be a valid date string";
            }
          }

          if (rrule.interval) {
            if (isNaN(parseInt(rrule.interval))) {
              throw "Recurrence rrule 'interval' must be an integer";
            }
          }

          if (rrule.count) {
            if (isNaN(parseInt(rrule.count))) {
              throw "Recurrence rrule 'count' must be an integer";
            }
          }

          if (typeof rrule.byday !== 'undefined') {
            if ((Object.prototype.toString.call(rrule.byday) !== '[object Array]')) {
              throw "Recurrence rrule 'byday' must be an array";
            }

            if (rrule.byday.length > 7) {
              throw "Recurrence rrule 'byday' array must not be longer than the 7 days in a week";
            }

            // Filter any possible repeats
            rrule.byday = rrule.byday.filter(function(elem, pos) {
              return rrule.byday.indexOf(elem) == pos;
            });

            for (var d in rrule.byday) {
              if (BYDAY_VALUES.indexOf(rrule.byday[d]) < 0) {
                throw "Recurrence rrule 'byday' values must include only the following: 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'";
              }
            }
          }
        }
      }

      var start_date = new Date(begin);
      var end_date = new Date(stop);
      var now_date = new Date();

      // Format dates with timezone info
      var start_formatted = formatDateTimeLocal(start_date);
      var end_formatted = formatDateTimeLocal(end_date);
      var now_formatted = formatDateTimeUTC(now_date);

      // Build RRULE if provided
      var rrule_line = '';
      if (rrule) {
        if (rrule.rrule) {
          rrule_line = rrule.rrule;
        } else {
          rrule_line = 'RRULE:FREQ=' + rrule.freq;
          if (rrule.until) {
            var until_date = new Date(Date.parse(rrule.until));
            var until_formatted = formatDateTimeUTC(until_date);
            rrule_line += ';UNTIL=' + until_formatted;
          }
          if (rrule.interval) {
            rrule_line += ';INTERVAL=' + rrule.interval;
          }
          if (rrule.count) {
            rrule_line += ';COUNT=' + rrule.count;
          }
          if (rrule.byday && rrule.byday.length > 0) {
            rrule_line += ';BYDAY=' + rrule.byday.join(',');
          }
        }
      }

      // Build event
      var calendarEvent = [
        'BEGIN:VEVENT',
        'UID:' + uuidv4() + '@' + uidDomain,
        'CLASS:PUBLIC',
        'DESCRIPTION:' + description,
        'DTSTAMP:' + now_formatted,
        'DTSTART;TZID=America/Los_Angeles:' + start_formatted,
        'DTEND;TZID=America/Los_Angeles:' + end_formatted,
        'LOCATION:' + location,
        'SUMMARY;LANGUAGE=en-us:' + subject,
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      ];

      // Insert RRULE if present
      if (rrule_line) {
        calendarEvent.splice(5, 0, rrule_line);
      }

      calendarEvent = calendarEvent.join(SEPARATOR);
      calendarEvents.push(calendarEvent);
      return calendarEvent;
    },

    /**
     * Download calendar using the saveAs function from filesave.js
     * @param  {string} filename Filename
     * @param  {string} ext      Extention
     */
    'download': function(filename, ext) {
      if (calendarEvents.length < 1) {
        return false;
      }

      ext = (typeof ext !== 'undefined') ? ext : '.ics';
      filename = (typeof filename !== 'undefined') ? filename : 'calendar';
      var calendar = calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;

      var blob;
      if (navigator.userAgent.indexOf('MSIE 10') === -1) { // chrome or firefox
        blob = new Blob([calendar]);
      } else { // ie
        var bb = new BlobBuilder();
        bb.append(calendar);
        blob = bb.getBlob('text/x-vCalendar;charset=' + document.characterSet);
      }
      saveAs(blob, filename + ext);
      return calendar;
    },

    /**
     * Build and return the ical contents
     */
    'build': function() {
      if (calendarEvents.length < 1) {
        return false;
      }

      var calendar = calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;

      return calendar;
    }
  };
};