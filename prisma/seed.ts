import { hash } from "bcryptjs";
import prismaClient from "../src/prisma";

async function seed() {
  const passwordHash = await hash("123456", 8);

  await prismaClient.user.upsert({
    where: {
      email: "admin@werk.com.br",
    },
    update: {},
    create: {
      id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
      name: "Sergio Botelho",
      email: "admin@werk.com.br",
      password: passwordHash,
    },
  });

  console.log("Database seeded!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
