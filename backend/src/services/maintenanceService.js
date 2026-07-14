function createMaintenanceService({ messagesRepository, sidebarEventsRepository, exportService, config, logger }) {
  return {
    async purgeAll(options = {}) {
      const exportFirst = options.exportFirst !== undefined
        ? Boolean(options.exportFirst)
        : config.maintenance.exportBeforePurge;

      let exportedFilePath = null;
      if (exportFirst) {
        exportedFilePath = await exportService.exportMessages({
          format: config.exports.defaultFormat,
          filters: {}
        });
      }

      const sidebarDeleted = sidebarEventsRepository.clearAll();
      const messagesDeleted = messagesRepository.clearAll();

      logger.info("Maintenance purge completed.", {
        exportedFilePath,
        messagesDeleted,
        sidebarDeleted
      });

      return {
        exportedFilePath,
        messagesDeleted,
        sidebarDeleted
      };
    }
  };
}

module.exports = {
  createMaintenanceService
};
