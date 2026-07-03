import app from "./app";
import { ENV } from "./config/env";
import { prisma } from "./config/database";

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log(
      "Database connection successfully established via Prisma Client.",
    );

    app.listen(ENV.PORT, () => {
      console.log(
        `MOTI Support Portal API running cleanly on port ${ENV.PORT}`,
      );
    });
  } catch (error) {
    console.error("Critical Error: Server initialization aborted!", error);
    process.exit(1);
  }
};

startServer();
