export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare("SELECT * FROM registros ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const r = await request.json();
        const res = await env.DB.prepare(`
            INSERT INTO registros (
                fecha, tipo, nombreRep, cedulaRep, telefonoRep, direccionRep,
                nombreNNA, edadNNA, fechaNacNNA, cedulaNNA, departamento, servicio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            r.fecha, r.tipo, r.nombreRep, r.cedulaRep, r.telefonoRep, r.direccionRep,
            r.nombreNNA, r.edadNNA, r.fechaNacNNA, r.cedulaNNA, r.departamento, r.servicio
        ).run();

        return new Response(JSON.stringify({ success: true, id: res.meta.last_row_id }));
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400 });

        await env.DB.prepare("DELETE FROM registros WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }));
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}