const express = require("express");
const {
  registrarVenta,
  listarVentasPorCliente,
  eliminarVenta,
} = require("../controllers/ventasController");

const router = express.Router();

router.post("/ventas", registrarVenta);
router.get("/ventas/cliente/:clienteId", listarVentasPorCliente);
router.delete("/ventas/:id", eliminarVenta);

module.exports = router;
