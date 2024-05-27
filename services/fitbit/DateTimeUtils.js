const moment = require("moment");

function dateToTimestamp(date) {
	return moment(date).unix();
}

function getNowAsTimestamp() {
	return moment().unix();
}

function getFormatedDateFromTimestamp(timestamp, format) {
	return moment.unix(timestamp).format(format);
}

/**
 * Generate a list of dates each with start and end time.
 * @param {*} startTimestamp The start date time.
 * @param {*} endTimestamp The end date time.
 * @returns A list of dates with time ranges
 */
function getTimeRanges(startTimestamp, endTimestamp) {
	let ranges = [];
	let startDateTime = moment(moment.unix(startTimestamp), "YYYY-MM-DD HH:mm:ss");
	let endDateTime = moment(moment.unix(endTimestamp), "YYYY-MM-DD HH:mm:ss");
	let currentDateTime = startDateTime.clone();

	while (currentDateTime.isBefore(endDateTime)) {
		let startOfTheCurrentDay = getStartOfTheCurrentDay(currentDateTime.clone(), startDateTime.clone());
		let endOfTheCurrentDay = getEndOfTheCurrentDay(currentDateTime.clone(), endDateTime.clone());
		let timeDifferences = endOfTheCurrentDay.diff(startOfTheCurrentDay, "seconds");
		if (timeDifferences > 0) {
			ranges.push({
				date: currentDateTime.format("YYYY-MM-DD"),
				startTime: startOfTheCurrentDay.format("HH:mm:ss"),
				endTime: endOfTheCurrentDay.format("HH:mm:ss")
			});
		}
		currentDateTime.add(1, "day").startOf("day");
	}
	return ranges;
}

/**
 * Generate a list of date and time ranges each with start and end date time.
 * @param {*} startTimestamp The start date time.
 * @param {*} endTimestamp The end date time.
 * @param {*} maximumRange The maximum range such as number of days in between.
 * @returns A list of date and time ranges
 */
function getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange) {
	let ranges = [];
	let startDateTime = moment(moment.unix(startTimestamp), "YYYY-MM-DD HH:mm:ss");
	let endDateTime = moment(moment.unix(endTimestamp), "YYYY-MM-DD HH:mm:ss");
	let currentDateTime = startDateTime.clone();
	let nextDateTime = startDateTime.clone();

	while (currentDateTime.isBefore(endDateTime)) {
		let dayDifferences = endDateTime.diff(currentDateTime, "day");
		if (dayDifferences > maximumRange) {
			nextDateTime.add(maximumRange, "day");
		} else {
			nextDateTime.add(dayDifferences, "day");
		}

		let startOfTheCurrentDate = getStartOfTheCurrentDay(currentDateTime.clone(), startDateTime.clone());
		let endOfTheNextDate = getEndOfTheCurrentDay(nextDateTime.clone(), endDateTime.clone());

		let timeDifferences = endOfTheNextDate.diff(startOfTheCurrentDate, "seconds");
		if(timeDifferences > 0) {
			ranges.push({
				startDate: currentDateTime.format("YYYY-MM-DD"),
				startTime: startOfTheCurrentDate.format("HH:mm:ss"),
				endDate: nextDateTime.format("YYYY-MM-DD"),
				endTime: endOfTheNextDate.format("HH:mm:ss")
			});	
		}
		
		currentDateTime.add(maximumRange + 1, "day").startOf("day");
		nextDateTime.add(1, "day").startOf("day");

	}
	return ranges;
}

function getStartOfTheCurrentDay(currentDateTime, startDateTime) {
	if (currentDateTime.isSame(startDateTime, "day")) {
		return startDateTime;
	} else {
		return currentDateTime.startOf("day");
	}
}

function getEndOfTheCurrentDay(currentDateTime, endDateTime) {
	if (currentDateTime.isSame(endDateTime, "day")) {
		return endDateTime;
	} else {
		return currentDateTime.endOf("day");
	}
}

function getTimestampFromISOTimestamp(ISOTimestamp) {
	return new Date(ISOTimestamp).getTime() / 1000;
}

function isTimestampToday(timestamp) {
	const date = moment.unix(timestamp);
	const currentDate = moment();

	return (
		date.isSame(currentDate, "day") &&
		date.isSame(currentDate, "month") &&
		date.isSame(currentDate, "year")
	);
}

function getCurrentDateTime() {
	return moment().format('YYYY-MM-DD HH:mm:ss');
}

function getExpirationDateTime(expiresIn) {
	return moment().add(expiresIn, 'Seconds').format('YYYY-MM-DD HH:mm:ss');
}

function getTimestampFromDateAndTime(date, time) {
	let dateTimeString = `${date} ${time}`;
	let dateTime = moment(dateTimeString, "YYYY-MM-DD HH:mm:ss");

	if (dateTime.isValid()) {
		return dateTime.toDate();
	} else throw Error("Invalid date or time format");
}

module.exports = {
	dateToTimestamp,
	getNowAsTimestamp,
	getFormatedDateFromTimestamp,
	getTimeRanges,
	getDateAndTimeRanges,
	getTimestampFromISOTimestamp,
	isTimestampToday,
	getCurrentDateTime,
	getExpirationDateTime,
	getTimestampFromDateAndTime
};
