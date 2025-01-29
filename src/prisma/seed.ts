import { hash } from "bcryptjs";
import AppError from "../utils/appError";
import prismaClient from "./";

async function seed() {
  const passwordHash = await hash("123456", 8);
  await prismaClient.user.create({
    data: {
      id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
      name: "Sergio Botelho",
      email: "admin@werk.com.br",
      password: passwordHash,
    },
  });
}

seed()
  .then(() => {
    console.log("Database seeded!");
    prismaClient.$disconnect();
  })
  .catch((error) => {
    throw new AppError("Seed ja exite", 400);
  });
