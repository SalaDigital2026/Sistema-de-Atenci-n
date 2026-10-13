export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const { accion, user, pass, nombre } = body;

        if (accion === "register") {
            // Verificar si el usuario ya existe
            const existente = await env.DB.prepare("SELECT user FROM usuarios WHERE LOWER(user) = LOWER(?)")
                .bind(user.trim())
                .first();

            if (existente) {
                return new Response(JSON.stringify({ error: "El usuario ya existe." }), { status: 400 });
            }

            await env.DB.prepare("INSERT INTO usuarios (nombre, user, pass) VALUES (?, ?, ?)")
                .bind(nombre.trim(), user.trim().toLowerCase(), pass)
                .run();

            return new Response(JSON.stringify({ success: true, message: "Usuario registrado con éxito." }));
        }

        if (accion === "login") {
            const row = await env.DB.prepare("SELECT * FROM usuarios WHERE LOWER(user) = LOWER(?) AND pass = ?")
                .bind(user.trim(), pass)
                .first();

            if (!row) {
                return new Response(JSON.stringify({ error: "Credenciales incorrectas." }), { status: 401 });
            }

            return new Response(JSON.stringify({
                success: true,
                user: { nombre: row.nombre, user: row.user }
            }));
        }

        return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}