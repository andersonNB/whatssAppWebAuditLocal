const nodemailer = require("nodemailer");

function createMailService(smtpConfig, logger) {
  if (!smtpConfig.enabled) {
    return {
      async sendExportEmail() {
        throw new Error("SMTP is disabled.");
      }
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.user
      ? {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        }
      : undefined
  });

  return {
    async sendExportEmail({ subject, text, attachmentPath }) {
      const info = await transporter.sendMail({
        from: smtpConfig.from,
        to: smtpConfig.to,
        subject,
        text,
        attachments: [
          {
            filename: require("path").basename(attachmentPath),
            path: attachmentPath
          }
        ]
      });
      logger.info("Export email sent.", { messageId: info.messageId });
      return info;
    }
  };
}

module.exports = {
  createMailService
};
