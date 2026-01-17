import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedService = {
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  active: boolean;
};

const SERVICES: SeedService[] = [
  {
    name: "Corte Comum",
    price: 30,
    duration: 30,
    category: "Cabelo",
    description: "Corte clássico masculino.",
    active: true,
  },
  {
    name: "Degradê",
    price: 35,
    duration: 40,
    category: "Cabelo",
    description: "Degradê moderno com acabamento.",
    active: true,
  },
  {
    name: "Cabelo e Barba",
    price: 50,
    duration: 60,
    category: "Pacotes",
    description: "Combo com corte e barba.",
    active: true,
  },
];

async function upsertService(s: SeedService) {
  const existing = await prisma.service.findFirst({
    where: { name: s.name },
    select: { id: true },
  });

  if (!existing) {
    await prisma.service.create({ data: s });
    return;
  }

  await prisma.service.update({
    where: { id: existing.id },
    data: {
      price: s.price,
      duration: s.duration,
      category: s.category ?? null,
      description: s.description ?? null,
      active: s.active,
    },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida.");
  }

  for (const s of SERVICES) await upsertService(s);

  console.log("✅ Seed finalizado: serviços garantidos/atualizados.");
}

main()
  .catch((e) => {
    console.error("Seed falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const DEFAULT_OPEN = 7 * 60;
const DEFAULT_CLOSE = 23 * 60;

for (let weekday = 0; weekday <= 6; weekday++) {
  await prisma.businessHours.upsert({
    where: { weekday },
    update: {},
    create: {
      weekday,
      isOpen: true,
      openMins: DEFAULT_OPEN,
      closeMins: DEFAULT_CLOSE,
    },
  });
}

console.log("Horários padrão da studio garantidos.");