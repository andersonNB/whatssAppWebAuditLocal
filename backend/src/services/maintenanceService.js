function createMaintenanceService({ db, messagesRepository, sidebarEventsRepository, exportService, config, logger }) {
  const purgeTransaction = db.transaction(() => {
    const sidebarDeleted = sidebarEventsRepository.clearAll();
    const messagesDeleted = messagesRepository.clearAll();

    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('messages', 'sidebar_events')").run();

    return {
      messagesDeleted,
      sidebarDeleted
    };
  });

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

      const { sidebarDeleted, messagesDeleted } = purgeTransaction();

      logger.info("Maintenance purge completed.", {
        exportedFilePath,
        messagesDeleted,
        sidebarDeleted,
        resetSequences: true
      });

      return {
        exportedFilePath,
        messagesDeleted,
        sidebarDeleted,
        resetSequences: true
      };
    }
  };
}

module.exports = {
  createMaintenanceService
};
