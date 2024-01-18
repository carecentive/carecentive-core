const Winston = require("winston");
const Config = require("../services/fitbit/Config")

// Two version of format is used. One for file format and another for console format.
// As of 18th January, 2024, Colorize version have some ansi code which is not supported in the file.
// There is an open issue in the winston library regarding this.
// https://github.com/winstonjs/winston/issues/2266

const consoleFormat = Winston.format.combine(
    Winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
    }),
    Winston.format.colorize(),
    Winston.format.metadata(),
    Winston.format.errors({ stack: true }),
    Winston.format.printf(info => formatConsoleInfo(info))
);

const fileFormat = Winston.format.combine(
    Winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    Winston.format.metadata(),
    Winston.format.errors({ stack: true }),
    Winston.format.json(),
    Winston.format.printf(info => info.metadata.timestamp + ": " + JSON.stringify({ info }))
);

function formatConsoleInfo(info) {
    var text = "[" + info.level + "]" + "[" + info.metadata.service + "] " + info.metadata.timestamp
        + ": " + info.message;

    if (info.metadata.stack) {
        text += "\n" + info.metadata.stack;
    }

    return text;
}

function getlevel() {
    if (Config.debug) {
        return "debug";
    }
    return "info";
}

var logger = Winston.createLogger({
    level: getlevel(),
    defaultMeta: { service: 'core-service' },
    transports: [
        new Winston.transports.File({ filename: 'logs/combined.log', format: fileFormat }),
        new Winston.transports.Console({ format: consoleFormat })
    ],
    exceptionHandlers: [
        new Winston.transports.File({ filename: 'logs/combined.log', format: fileFormat }),
        new Winston.transports.Console({ format: consoleFormat })
    ],
    rejectionHandlers: [
        new Winston.transports.File({ filename: 'logs/combined.log', format: fileFormat }),
        new Winston.transports.Console({ format: consoleFormat })
    ],
    exitOnError: false
});

module.exports = logger;