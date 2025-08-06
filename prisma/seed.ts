import { prisma } from "@/lib/prisma";

async function main() {
    await prisma.service.createMany({
        data: [
            { name: "Corte Comum", price: 30, duration: 30 },
            { name: "Degrade", price: 35, duration: 40 },
            { name: "Cabelo e Barba", price: 50, duration: 60 },
        ],
    });
    console.log("Registered services!");
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });