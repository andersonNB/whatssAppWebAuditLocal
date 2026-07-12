const cron = require("node-cron");

function createSchedulerService({ config, exportService, mailService, logger }) {
  let task = null;

  return {
    start() {
      if (!config.exports.cronEnabled) {
        logger.info("Export scheduler disabled.");
        return;
      }

      task = cron.schedule(config.exports.cronExpression, async () => {
        try {
          const filePath = await exportService.exportMessages({
            format: config.exports.defaultFormat,
            filters: {}
          });

          logger.info("Scheduled export completed.", {
            filePath
          });

          if (config.smtp.enabled) {
            await mailService.sendExportEmail({
              subject: "WhatsApp Web export",
              text: "Se adjunta la exportacion automatica.",
              attachmentPath: filePath
            });
          }
        } catch (error) {
          logger.error("Scheduled export failed.", {
            error: error.message
          });
        }
      });

      logger.info("Export scheduler started.", {
        cron: config.exports.cronExpression
      });
    },
    stop() {
      if (task) {
        task.stop();
      }
    }
  };
}

module.exports = {
  createSchedulerService
};
