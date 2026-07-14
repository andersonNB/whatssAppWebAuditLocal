const cron = require("node-cron");

function createSchedulerService({ config, exportService, maintenanceService, mailService, logger }) {
  const tasks = [];

  return {
    start() {
      if (!config.exports.cronEnabled) {
        logger.info("Export scheduler disabled.");
      } else {
        const exportTask = cron.schedule(config.exports.cronExpression, async () => {
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
        }, {
          timezone: config.maintenance.timezone
        });

        tasks.push(exportTask);

        logger.info("Export scheduler started.", {
          cron: config.exports.cronExpression,
          timezone: config.maintenance.timezone
        });
      }

      if (!config.maintenance.purgeEnabled) {
        logger.info("Purge scheduler disabled.");
        return;
      }

      const purgeTask = cron.schedule(config.maintenance.purgeCronExpression, async () => {
        try {
          const result = await maintenanceService.purgeAll();

          logger.info("Scheduled purge completed.", {
            exportedFilePath: result.exportedFilePath,
            messagesDeleted: result.messagesDeleted,
            sidebarDeleted: result.sidebarDeleted
          });
        } catch (error) {
          logger.error("Scheduled purge failed.", {
            error: error.message
          });
        }
      }, {
        timezone: config.maintenance.timezone
      });

      tasks.push(purgeTask);

      logger.info("Purge scheduler started.", {
        cron: config.maintenance.purgeCronExpression,
        timezone: config.maintenance.timezone
      });
    },
    stop() {
      tasks.forEach((task) => task.stop());
    }
  };
}

module.exports = {
  createSchedulerService
};
