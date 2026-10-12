import { compare, hash } from "bcryptjs";
import prismaClient from "../src/prisma";

const ADMIN_EMAIL = "admin@werk.com.br";
const SEED_PASSWORD = "123456";

async function seed() {
  const passwordHash = await hash(SEED_PASSWORD, 8);

  // O update vazio preserva perfil e situação definidos pela tela de usuários
  const admin = await prismaClient.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {},
    create: {
      id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
      name: "Sergio Botelho",
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "ADMIN",
    },
  });

  // A senha do seed é pública no repositório: obriga a troca enquanto ela não mudar
  if (
    !admin.mustChangePassword &&
    (await compare(SEED_PASSWORD, admin.password))
  ) {
    await prismaClient.user.update({
      where: { id: admin.id },
      data: { mustChangePassword: true },
    });
  }

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
