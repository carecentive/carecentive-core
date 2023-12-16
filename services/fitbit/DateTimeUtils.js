const moment = require("moment");

function getDatetimeString (date) {
	let datetimeString = date.getUTCFullYear() + "-" +
        ("00" + (date.getUTCMonth()+1)).slice(-2) + "-" +
        ("00" + date.getUTCDate()).slice(-2) + " " + 
        ("00" + date.getUTCHours()).slice(-2) + ":" + 
        ("00" + date.getUTCMinutes()).slice(-2) + ":" + 
        ("00" + date.getUTCSeconds()).slice(-2);

	return datetimeString;
}

function dateToTimestamp (date) {
	return Math.round(date/1000);
}

function getNowAsTimestamp() {
	return Math.round(new Date()/1000);
}

function getFormatedDateFromTimestamp(timestamp, format) {
	return moment.unix(timestamp).format(format);
}

function getDateRanges(startDate, endDate, intervalDays) {
	const ranges = [];
	startDate = moment(startDate, "YYYY-MM-DD");
	endDate = moment(endDate, "YYYY-MM-DD");
	let now = moment();
	let currentEndDate;
  
	while (startDate.isBefore(endDate)) {
		if(now.diff(startDate, "days") < intervalDays) {
			currentEndDate = now;
		} else {
			currentEndDate = moment(startDate).add(intervalDays, "days").subtract(1, "day");
		}

		ranges.push({
			start: startDate.format("YYYY-MM-DD"),
			end: currentEndDate.format("YYYY-MM-DD")
		});

		startDate = moment(currentEndDate).add(1, "day");
	}

	return ranges;
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

module.exports = {
	getDatetimeString,
	dateToTimestamp,
	getNowAsTimestamp,
	getFormatedDateFromTimestamp,
	getDateRanges,
	getTimestampFromISOTimestamp,
	isTimestampToday,
	getCurrentDateTime,
	getExpirationDateTime
};
