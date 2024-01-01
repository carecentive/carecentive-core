const Cron = require("node-cron");
const { SchedulerError } = require("../../source/Errors");

class Scheduler {
    static task;

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

    static async processTasks(taskFunction) {
        try {
            await taskFunction();   
        } catch (error) {
            throw new SchedulerError("Error during execution: "+ error);
        }
    }

    static start() {
        if (!this.task) {
            throw new SchedulerError("Initialize the scheduler by calling init before starting the task!");
        }

        console.log("Starting the scheduler task!");
        this.task.start();
    }

    static stop() {
        if (!this.task) {
            throw new SchedulerError("There is no running task to stop!");
        }

        console.log("Stoping the scheduler task!");
        this.task.stop();
    }
}

module.exports = Scheduler;