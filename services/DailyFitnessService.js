var cron = require("node-cron");
const GoogleFitnessService = require("./FitnessService");

/**
 * Runs cron-job every data at 23:59 (Timezone set to EU/Berlin) to fetch google fitness data for each users
 */
cron.schedule(
  "59 23 * * *",
  async () => {
    console.log("Daily Fitness task run");
    const allusers = await GoogleFitnessService.getAllGoogleUser();
    if (allusers.length) {
      allusers.forEach(async (user) => {
        const startFetch = await GoogleFitnessService.syncData(user);
      });
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Berlin",
  }
);
