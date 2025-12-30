const express = require("express");
const db = require("../db");

const router = express.Router();

const STATUS_DEFAULT_ID = 1;

async function statusExists(statusId) {
  const r = await db.query("SELECT id FROM todo_task_status WHERE id = $1", [statusId]);
  return r.rowCount > 0;
}

async function userExists(userId) {
  const r = await db.query("SELECT id FROM todo_users WHERE id = $1", [userId]);
  return r.rowCount > 0;
}

router.post("/", async (req, res, next) => {
  try {
    const { title, description, responsible_user_id, status_id } = req.body;

    // 400 quando título vazio
    if (!title || String(title).trim() === "") {
      return res.status(400).json({ error: "Título é obrigatório e não pode estar vazio" });
    }

    // status default = Novo (1)
    const finalStatusId = status_id ?? STATUS_DEFAULT_ID;

    // 400 quando status inválido
    const isValidStatus = await statusExists(finalStatusId);
    if (!isValidStatus) {
      return res.status(400).json({ error: "Status inválido" });
    }

    // responsável opcional, mas se vier tem que existir
    if (responsible_user_id !== undefined && responsible_user_id !== null) {
      const isValidUser = await userExists(responsible_user_id);
      if (!isValidUser) {
        return res.status(400).json({ error: "responsible_user_id inválido (usuário não existe)" });
      }
    }

    const insert = await db.query(
      `
      INSERT INTO todo_tasks (title, description, responsible_user_id, status_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [
        String(title).trim(),
        description ?? null,
        responsible_user_id ?? null,
        finalStatusId
      ]
    );

    const newId = insert.rows[0].id;

    // retorna já com JOIN (responsável + status)
    const full = await db.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.created_at,
        t.updated_at,
        s.id AS status_id,
        s.name AS status_name,
        u.id AS responsible_id,
        u.name AS responsible_name
      FROM todo_tasks t
      JOIN todo_task_status s ON s.id = t.status_id
      LEFT JOIN todo_users u ON u.id = t.responsible_user_id
      WHERE t.id = $1
      `,
      [newId]
    );

    return res.status(201).json(full.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// BUSCAR TASK POR ID
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.created_at,
        t.updated_at,
        s.id AS status_id,
        s.name AS status_name,
        u.id AS responsible_id,
        u.name AS responsible_name
      FROM todo_tasks t
      JOIN todo_task_status s ON s.id = t.status_id
      LEFT JOIN todo_users u ON u.id = t.responsible_user_id
      WHERE t.id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task não encontrada" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// EDITAR TASK
router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, description, responsible_user_id, status_id } = req.body;

    // 1) Verifica se existe
    const current = await db.query("SELECT * FROM todo_tasks WHERE id = $1", [id]);
    if (current.rowCount === 0) {
      return res.status(404).json({ error: "Task não encontrada" });
    }

    // 2) Validações (somente se o campo foi enviado)
    if (title !== undefined && String(title).trim() === "") {
      return res.status(400).json({ error: "Título é obrigatório e não pode estar vazio" });
    }

    if (status_id !== undefined && status_id !== null) {
      const okStatus = await statusExists(status_id);
      if (!okStatus) return res.status(400).json({ error: "Status inválido" });
    }

    if (responsible_user_id !== undefined && responsible_user_id !== null) {
      const okUser = await userExists(responsible_user_id);
      if (!okUser) return res.status(400).json({ error: "responsible_user_id inválido (usuário não existe)" });
    }
    

    // 3) Monta os novos valores (se não veio, mantém o atual)
    const old = current.rows[0];

    const newTitle = title !== undefined ? String(title).trim() : old.title;
    const newDesc = description !== undefined ? (description ?? null) : old.description;
    const newResponsible = responsible_user_id !== undefined ? (responsible_user_id ?? null) : old.responsible_user_id;
    const newStatus = status_id !== undefined ? (status_id ?? old.status_id) : old.status_id;

    await db.query(
      `
      UPDATE todo_tasks
      SET title = $1, description = $2, responsible_user_id = $3, status_id = $4
      WHERE id = $5
      `,
      [newTitle, newDesc, newResponsible, newStatus, id]
    );

    // 4) Retorna com JOIN
    const full = await db.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.created_at,
        t.updated_at,
        s.id AS status_id,
        s.name AS status_name,
        u.id AS responsible_id,
        u.name AS responsible_name
      FROM todo_tasks t
      JOIN todo_task_status s ON s.id = t.status_id
      LEFT JOIN todo_users u ON u.id = t.responsible_user_id
      WHERE t.id = $1
      `,
      [id]
    );

    return res.json(full.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETAR TASK
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query("DELETE FROM todo_tasks WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task não encontrada" });
    }

    return res.json({ message: "Task removida com sucesso" });
  } catch (err) {
    return next(err);
  }
});



router.get("/", async (req, res, next) => {
  try {
    const { status_id, responsible_user_id, order } = req.query;

    const where = [];
    const params = [];
    let idx = 1;

    if (status_id) {
      where.push(`t.status_id = $${idx++}`);
      params.push(Number(status_id));
    }

    if (responsible_user_id) {
      where.push(`t.responsible_user_id = $${idx++}`);
      params.push(Number(responsible_user_id));
    }

    const direction = String(order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const sql = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.created_at,
        t.updated_at,
        s.id AS status_id,
        s.name AS status_name,
        u.id AS responsible_id,
        u.name AS responsible_name
      FROM todo_tasks t
      JOIN todo_task_status s ON s.id = t.status_id
      LEFT JOIN todo_users u ON u.id = t.responsible_user_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY t.created_at ${direction}
    `;

    const result = await db.query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
