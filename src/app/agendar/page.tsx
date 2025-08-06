"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AgendarPage() {
    const [services, setServices] = useState([]);

    useEffect(() => {
        fetch("/api/services")
        .then(res => res.json())
        .then(data => setServices(data));
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">Choose your service</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {services.map((s: any) => (
                    <div key={s.id} className="border p-4 rounded shadow">
                        <h2 className="text-xl font-bold">{s.name}</h2>
                        <p>R$ {s.price.toFixed(2)}</p>
                        <Link href={`/agendar/${s.id}`}>
                            <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                                Selecionar
                            </button>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}