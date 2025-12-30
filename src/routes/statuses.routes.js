const express = require("express");
const router = express.Router();

const STATUSES = [
  { id: 1, name: "Novo" },
  { id: 2, name: "Em andamento" },
  { id: 3, name: "Pronto para avaliar" },
  { id: 4, name: "Ajuste necessário" },
  { id: 5, name: "Finalizado" },
];

router.get("/", (req, res) => {
  return res.status(200).json(STATUSES);
});

module.exports = router;
