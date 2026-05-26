import { hash } from "bcryptjs";
import prismaClient from "../src/prisma";

async function seed() {
  const userAlreadyExists = await prismaClient.user.findUnique({
    where: {
      email: "admin@werk.com.br",
    },
  });

  if (userAlreadyExists) {
    console.log("Seed já existe.");
    return;
  }

  const passwordHash = await hash("123456", 8);

  await prismaClient.user.create({
    data: {
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
