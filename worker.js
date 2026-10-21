export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- 1. SETUP DE TABLAS ---
    if (url.pathname === "/api/setup") {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            user TEXT UNIQUE,
            pass TEXT
          );
        `).run();

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

        const adminCheck = await env.DB.prepare("SELECT * FROM usuarios WHERE user = 'admin'").first();
        if (!adminCheck) {
          await env.DB.prepare("INSERT INTO usuarios (nombre, user, pass) VALUES (?, ?, ?)")
            .bind("Administrador Principal", "admin", "admin123")
            .run();
        }

        return new Response(JSON.stringify({ status: "ok", message: "Tablas listas en D1" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- 2. AUTH (LOGIN / REGISTRO) ---
    if (url.pathname === "/api/auth" && request.method === "POST") {
      try {
        const body = await request.json();
        const { accion, user, pass, nombre } = body;

        if (accion === "register") {
          const existente = await env.DB.prepare("SELECT user FROM usuarios WHERE LOWER(user) = LOWER(?)")
            .bind(user.trim())
            .first();

          if (existente) {
            return new Response(JSON.stringify({ error: "El usuario ya existe." }), { status: 400, headers: corsHeaders });
          }

          await env.DB.prepare("INSERT INTO usuarios (nombre, user, pass) VALUES (?, ?, ?)")
            .bind(nombre.trim(), user.trim().toLowerCase(), pass)
            .run();

          return new Response(JSON.stringify({ success: true, message: "Usuario registrado con éxito." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (accion === "login") {
          const row = await env.DB.prepare("SELECT * FROM usuarios WHERE LOWER(user) = LOWER(?) AND pass = ?")
            .bind(user.trim(), pass)
            .first();

          if (!row) {
            return new Response(JSON.stringify({ error: "Credenciales incorrectas." }), { status: 401, headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            success: true,
            user: { nombre: row.nombre, user: row.user }
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- 3. ATENCIONES (GET, POST, PUT, DELETE) ---
    if (url.pathname === "/api/registros") {
      try {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM registros ORDER BY id DESC").all();
          return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (request.method === "POST") {
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

          return new Response(JSON.stringify({ success: true, id: res.meta.last_row_id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (request.method === "PUT") {
          const r = await request.json();
          await env.DB.prepare(`
            UPDATE registros SET
              tipo = ?, nombreRep = ?, cedulaRep = ?, telefonoRep = ?, direccionRep = ?,
              nombreNNA = ?, edadNNA = ?, fechaNacNNA = ?, cedulaNNA = ?, departamento = ?, servicio = ?
            WHERE id = ?
          `).bind(
            r.tipo, r.nombreRep, r.cedulaRep, r.telefonoRep, r.direccionRep,
            r.nombreNNA, r.edadNNA, r.fechaNacNNA, r.cedulaNNA, r.departamento, r.servicio, r.id
          ).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (request.method === "DELETE") {
          const id = url.searchParams.get("id");
          if (!id) return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400, headers: corsHeaders });

          await env.DB.prepare("DELETE FROM registros WHERE id = ?").bind(id).run();
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- 4. ASSETS ESTÁTICOS CON CONTROL ANTI-CACHÉ ---
    const assetResponse = await env.ASSETS.fetch(request);
    const responseHeaders = new Headers(assetResponse.headers);
    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    responseHeaders.set("Pragma", "no-cache");
    responseHeaders.set("Expires", "0");

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: responseHeaders
    });
  }
};