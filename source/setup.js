var dotenv = require('dotenv');
var winston = require('winston');

function setup() {
/**
 * Set up environment
 */
 dotenv.config();

 /**
  * Set up logger
  */
 
  const logger = winston.createLogger({
   level: 'info',
   format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.json(),
    winston.format.printf(info => info.metadata.timestamp + ": " + JSON.stringify({info}))
  ),
   defaultMeta: { service: 'user-service' },
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
 
 winston.add(logger); 
}

module.exports = {setup};