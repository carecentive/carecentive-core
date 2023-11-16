var winston = require('winston');

var logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.colorize(),
        winston.format.errors({ stack: true }),
        winston.format.metadata(),
        //  winston.format.printf(info => info.metadata.timestamp + ": " + JSON.stringify({info}))
        //  winston.format.printf(info => info.metadata.timestamp + ": " + JSON.stringify(info, null, 2))
        //  winston.format.printf(info => info.message + ": " + info.metadata.stack)
        winston.format.printf(info => info.metadata.timestamp + ": " + info.metadata.stack)
      ),
    defaultMeta: { service: 'core-service' },
    transports: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ],
    exitOnError: false
});

module.exports = logger;