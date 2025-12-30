const express = require("express");
const cors = require("cors");

const tasksRoutes = require("./routes/tasks.routes");
const usersRoutes = require("./routes/users.routes");
const statusesRoutes = require("./routes/statuses.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/tasks", tasksRoutes);
app.use("/users", usersRoutes);
app.use("/statuses", statusesRoutes);

module.exports = app;
