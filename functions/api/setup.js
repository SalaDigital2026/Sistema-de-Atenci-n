export async function onRequest(context) {
    const { env } = context;
    try {
        // Crear tabla de usuarios
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                user TEXT UNIQUE,
                pass TEXT
            );
        `).run();

        // Crear tabla de atenciones
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS registros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha TEXT,
                tipo TEXT,
                nombreRep TEXT,
                cedulaRep TEXT,
                telefonoRep TEXT,
                direccionRep TEXT,
                nombreNNA TEXT,
                edadNNA TEXT,
                fechaNacNNA TEXT,
                cedulaNNA TEXT,
                departamento TEXT,
                servicio TEXT
            );
        `).run();

        // Insertar administrador inicial si no existe ninguno
        const adminCheck = await env.DB.prepare("SELECT * FROM usuarios WHERE user = 'admin'").first();
        if (!adminCheck) {
            await env.DB.prepare("INSERT INTO usuarios (nombre, user, pass) VALUES (?, ?, ?)")
                .bind("Administrador Principal", "admin", "admin123")
                .run();
        }

        return new Response(JSON.stringify({ status: "ok", message: "Tablas inicializadas correctamente." }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}