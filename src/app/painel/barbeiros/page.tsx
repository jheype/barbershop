"use client";

import { useEffect, useState } from "react";

type Barber = {
    id: string;
    name: string;
    photo: string;
};

export default function BarbeirosPainel() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [name, setName] = useState("");
    const [photo, setPhoto] = useState("");

    useEffect(() => {
        fetch("/api/admin/barbers")
            .then(res => res.json())
            .then(data => setBarbers(data));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch("/api/admin/barbers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, photo }),
        });

        if (res.ok) {
            const newBarber = await res.json();
            setBarbers(prev => [...prev, newBarber]);
            setName("");
            setPhoto("");
        } else {
            alert("Erro ao cadastrar barbeiro.");
        }
    };

    return (
        <div className="p-5 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Cadastrar Barbeiro</h1>

            <form onSubmit={handleSubmit} className="mb-10 space-y-4">
                <div>
                    <label className="block text-sm font-medium">Nome</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full p-2 border rounded text-black"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Link da Foto</label>
                    <input
                        type="url"
                        value={photo}
                        onChange={e => setPhoto(e.target.value)}
                        className="w-full p-2 border rounded text-black"
                        required
                    />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Cadastrar</button>
            </form>

            <h2 className="text-2xl font-semibold mb-4">Barbeiros Cadastrados</h2>
            <div className="grid grid-cols-2 gap-4">
                {barbers.map(barber => (
                    <div key={barber.id} className="border rounded-lg p-4 flex items-center gap-4">
                        <img
                            src={barber.photo}
                            alt={barber.name}
                            className="w-16 h-16 rounded-full object-cover"
                        />
                        <span className="font-medium text-lg">{barber.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}