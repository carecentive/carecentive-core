const moment = require("moment");

function getDatetimeString(date) {
	let datetimeString = date.getUTCFullYear() + "-" +
		("00" + (date.getUTCMonth() + 1)).slice(-2) + "-" +
		("00" + date.getUTCDate()).slice(-2) + " " +
		("00" + date.getUTCHours()).slice(-2) + ":" +
		("00" + date.getUTCMinutes()).slice(-2) + ":" +
		("00" + date.getUTCSeconds()).slice(-2);

	return datetimeString;
}

function dateToTimestamp(date) {
	return Math.round(date / 1000);
}

function getNowAsTimestamp() {
	return Math.round(new Date() / 1000);
}

function getFormatedDateFromTimestamp(timestamp, format) {
	return moment.unix(timestamp).format(format);
}

function getDateTimeRanges(startTimestamp, endTimestamp) {
	// create a list of ranges(date: yyyy-MM-dd, startTime: HH:mm:ss, endTime: HH:mm:ss)
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
	return getDatetimeString(new Date());
}

function getExpirationDateTime(expiresIn) {
	let date = new Date();
	date.setUTCSeconds(date.getUTCSeconds() + expiresIn);
	return getDatetimeString(date);
}

// date yyyy-MM-dd, time: HH:mm:ss
function getTimestampFromDateAndTime(date, time) {
	let dateTimeString = `${date} ${time}`;
	let dateTime = moment(dateTimeString, "YYYY-MM-DD HH:mm:ss");

	if (dateTime.isValid()) {
		return dateTime.toDate();
	} else throw Error("Invalid date or time format");
}

module.exports = {
	getDatetimeString,
	dateToTimestamp,
	getNowAsTimestamp,
	getFormatedDateFromTimestamp,
	getDateTimeRanges,
	getTimestampFromISOTimestamp,
	isTimestampToday,
	getCurrentDateTime,
	getExpirationDateTime,
	getTimestampFromDateAndTime
};
