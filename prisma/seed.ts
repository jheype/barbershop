import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("DB URL:", process.env.DATABASE_URL);
  await prisma.service.deleteMany({});

  await prisma.service.createMany({
    data: [
      { name: "Corte Comum",   price: 30, duration: 30, category: "Cabelo", description: "Corte clássico masculino.", active: true },
      { name: "Degradê",       price: 35, duration: 40, category: "Cabelo", description: "Degradê moderno com acabamento.", active: true },
      { name: "Cabelo e Barba",price: 50, duration: 60, category: "Pacotes",description: "Combo com corte e barba.", active: true },
    ],
  });

  console.log("✅ Registered services!");
}

main().finally(() => prisma.$disconnect());
