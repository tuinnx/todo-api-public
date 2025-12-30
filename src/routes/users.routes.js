const express = require("express");
const db = require("../db");

const router = express.Router();

// CRIAR USER
router.post("/", async (req, res, next) => {
  try {
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "name e email são obrigatórios" });
    }

    const result = await db.query(
      `
      INSERT INTO todo_users (name, email)
      VALUES ($1, $2)
      RETURNING id, name, email, created_at, updated_at
      `,
      [name, email]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // erro clássico de email duplicado (PostgreSQL unique constraint)
    if (err && err.code === "23505") {
      return res.status(400).json({ error: "Email já cadastrado" });
    }
    return next(err);
  }
});

// LISTAR USERS (com filtro opcional por email)
router.get("/", async (req, res, next) => {
  try {
    const { email } = req.query;

    if (email) {
      const result = await db.query(
        `
        SELECT id, name, email, created_at, updated_at
        FROM todo_users
        WHERE email = $1
        LIMIT 1
        `,
        [email]
      );

      // retorna array (padrão consistente com listagem)
      return res.json(result.rows);
    }

    const result = await db.query(`
      SELECT id, name, email, created_at, updated_at
      FROM todo_users
      ORDER BY created_at DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
