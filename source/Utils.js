const moment = require('moment');

function getDatetimeString (date) {
    let datetimeString = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' + 
        ('00' + date.getUTCHours()).slice(-2) + ':' + 
        ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
        ('00' + date.getUTCSeconds()).slice(-2);

    return datetimeString;
};

function dateToTimestamp (date) {
    return Math.round(date/1000);
}

function getNowAsTimestamp() {
    return Math.round(new Date()/1000)
}

function sortObjectByKeys (object) {
    sorted = Object.keys(object)
    .sort()
    .reduce((acc, key) => ({
        ...acc, [key]: object[key]
    }), {})

    return sorted;
}

/**
 * Calculates the current pregnancy week by a conception date
 * @param {Date (As Date/Datetime object or string)} conceptionDate 
 * @returns number The current pregnancy week
 */
function getPregnancyWeekByConceptionDate(conceptionDate) {
    let today = moment();
    let pregnancyWeek = today.diff(conceptionDate, 'weeks');
    return pregnancyWeek
}

/**
 * Get the datetime of the latest submitted questionnaire for all questionnaire IDs in the database
 * @param {*} allQuestionnaires A list of all questionnaires, in time-ascending order for one single user
 * @returns {Object} Key-value Object, keys are questionnaire IDs, values are the last datetime this questionnaire was submitted 
 */
function getLatestSubmissionByQuestionnaire (allQuestionnaires) {
    let latest = {};
    for (let questionnaire of allQuestionnaires) {
        latest[questionnaire.questionnaire] = questionnaire.datetime;
    }
    return latest;
}

/**
 * Get the datetime of the latest submitted photo for all photo types in the database
 * @param {*} allPhotos A list of all photo submissions, in time-ascending order for one single user
 * @returns {Object} Key-value Object, keys are photo IDs, values are the last datetime this photo type was submitted 
 */
 function getLatestSubmissionByPhoto (allPhotos) {
    let latest = {};
    for (let photo of allPhotos) {
        latest[photo.type] = photo.datetime;
    }
    return latest;
}


/**
 * Determines whether a questionnaire is active/should be displayed based on various factors
 * Note: Does not check whether the user currently is in pregnancy week X - this must be checked beforehand! 
 * Only checks whether a questionnaire was already answered in the respective week
 * 
 * @param {string (date)} lastQuestionnaireSubmissionDate The last (most recent) submission date of the questionnaire, as String
 * @param {string (date)} referenceDate The reference date used for week calculation, usually conception or birth date
 * @param {array} eligibleWeeks Weeks when this questionnaire should be active
 * @returns {Boolean} True or False, depending on whether the questionnaire should be active
 */
function isActivityActive (lastQuestionnaireSubmissionDate, referenceDate, eligibleWeeks ) {
    // Has the questionnaire ever been done before?

    if ( !lastQuestionnaireSubmissionDate ) {
        return true;
    }
    else {
        // Compare last questionnaire date and conception date
        let conceptionLastSubmissionWeekDifference = moment(lastQuestionnaireSubmissionDate).diff(referenceDate, 'weeks');

        if ( eligibleWeeks.includes(conceptionLastSubmissionWeekDifference) ) {
            return false;
        }
        else {
            return true;
        }
    }
}


/**
 * Takes an object that uses timestamps as keys and sorts it by date
 * Returns one date key for each date, in which the respective timestamps are now stored
 * Example: {2020-05-27T07:16:43.000Z => {...}, 2020-05-27T07:23:32.000Z => {...}, 2020-05-27T07:28:13.000Z => {...}
 * Returns: {2020-05-27 => {{2020-05-27T07:16:43.000Z => {...}, 2020-05-27T07:23:32.000Z => {...}, 2020-05-27T07:28:13.000Z => {...}}}
 * @param {*} object 
 */
function datetimeKeysToDateKeys(timestampSortedObject) {
    let dateSortedObject = {};

    for(let key in timestampSortedObject) {
        let dateString = moment(key).format("YYYY-MM-DD")
        
        if (!dateSortedObject[dateString]) {
        dateSortedObject[dateString] = {};
        }

        dateSortedObject[dateString][key] = timestampSortedObject[key];
    }

    return dateSortedObject;
}

function getRandomIntegerBetween(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

module.exports = {getDatetimeString, dateToTimestamp, getNowAsTimestamp, sortObjectByKeys, getPregnancyWeekByConceptionDate, getLatestSubmissionByQuestionnaire, getLatestSubmissionByPhoto, isActivityActive, datetimeKeysToDateKeys, getRandomIntegerBetween}

