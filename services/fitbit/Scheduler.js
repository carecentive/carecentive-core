const Cron = require("node-cron");
const { SchedulerError } = require("../../source/Errors");
const Logger = require("../../source/Loggers");

/**
 * Utility class for initializing, starting, and stopping scheduled tasks using node-cron.
 * Allows users to set a cron expression to define when a task should be executed.
 */
class Scheduler {
    static task;
    /**
	 * Initialize the scheduler with a cron expression and a task function.
	 * @param {string} cronExpression - A string representing a schedule that dictates when a task should be executed.
	 * @param {Function} taskFunction - The function that will be executed when the scheduler starts.
	 * @throws {SchedulerError} Throws an error if the cron expression is invalid.
	 */
    static init(cronExpression, taskFunction) {
        if (!Cron.validate(cronExpression)) {
            throw new SchedulerError("Invalid cron expression: " + cronExpression);
        }

        this.task = Cron.schedule(
            cronExpression,
            async () => {
                await this.processTasks(taskFunction);
            },
            {
                scheduled: false
            });
    }

    /**
     * Process the tasks by executing the task function.
     * @param {Function} taskFunction - The function representing the task to be executed.
     * @throws {SchedulerError} Throws an error if there is an error during task execution.
     */
    static async processTasks(taskFunction) {
        try {
            await taskFunction();   
        } catch (error) {
            throw new SchedulerError("Error during execution: "+ error);
        }
    }

    /**
     * Start the scheduler task.
     * @throws {SchedulerError} Throws an error if the scheduler task is not initialized.
     */
    static start() {
        if (!this.task) {
            throw new SchedulerError("Initialize the scheduler by calling init before starting the task!");
        }

        Logger.debug("Starting the scheduler task!");
        this.task.start();
    }

    /**
     * Stop the scheduler task.
     * @throws {SchedulerError} Throws an error if there is no running task to stop.
     */
    static stop() {
        if (!this.task) {
            throw new SchedulerError("There is no running task to stop!");
        }

        Logger.debug("Stoping the scheduler task!");
        this.task.stop();
    }
}

module.exports = Scheduler;