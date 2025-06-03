const Venta = require("../models/Venta");
const Producto = require("../models/Producto");
const Credito = require("../models/Credito");
const Pago = require("../models/pago");
const Cliente = require("../models/Cliente");
const Asesor = require("../models/asesorModel");

const registrarVenta = async (req, res) => {
  try {
    const {
      clienteSeleccionado,
      asesorSeleccionado,
      productoSeleccionado,
      cantidad,
      formaPago,
      cantidadCuotas,
    } = req.body;

    // Validar existencia de cliente, asesor y producto
    const cliente = await Cliente.findById(clienteSeleccionado);
    const asesor = await Asesor.findById(asesorSeleccionado);
    const producto = await Producto.findById(productoSeleccionado);

    if (!cliente || !asesor || !producto) {
      return res
        .status(404)
        .json({ error: "Cliente, asesor o producto no encontrado" });
    }

    // Validar stock del producto
    if (producto.stock < cantidad) {
      return res.status(400).json({ error: "Stock insuficiente" });
    }

    // Calcular valores de la venta y el crédito
    const montoBase = producto.precioVenta * cantidad;
    const intereses = {
      diario: 0.01,
      semanal: 0.05,
      quincenal: 0.15,
      mensual: 0.4,
    };
    const tasaInteres = intereses[formaPago];
    const totalInteres = montoBase * tasaInteres * cantidadCuotas;
    const totalPagar = montoBase + totalInteres;
    const montoCuota = totalPagar / cantidadCuotas;

    // Registrar el crédito
    const credito = await Credito.create({
      clienteSeleccionado: clienteSeleccionado,
      asesorSeleccionado: asesorSeleccionado,
      fechaCredito: new Date(),
      montoCredito: montoBase,
      formaPago,
      cantidadCuotas,
      montoInteres: totalInteres,
      montoCuota,
      totalInteres,
      totalPagar,
    });

    // Crear pagos asociados
    // for (let i = 1; i <= cantidadCuotas; i++) {
    //   const fechaPago = new Date();
    //   fechaPago.setDate(fechaPago.getDate() + (30 / cantidadCuotas) * i);

    //   await Pago.create({
    //     credito: credito._id,
    //     fechaPago,
    //     montoPago: montoCuota,
    //     saldoRestante: totalPagar - montoCuota * i,
    //     pagado: false,
    //   });
    // }

    // Registrar la venta
    const venta = await Venta.create({
      clienteSeleccionado: clienteSeleccionado,
      asesorSeleccionado: asesorSeleccionado,
      productoSeleccionado: productoSeleccionado,
      cantidad,
      totalVenta: totalPagar,
      formaPago,
      creditoAsociado: credito._id,
    });

    // Actualizar stock del producto
    producto.stock -= cantidad;
    await producto.save();

    res.status(201).json({ message: "Venta registrada con éxito", venta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar la venta" });
  }
};

const listarVentasPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const ventas = await Venta.find({ clienteSeleccionado: clienteId })
      .populate("clienteSeleccionado", "nombre apellidos")
      .populate("asesorSeleccionado", "nombre")
      .populate("productoSeleccionado", "nombre descripcion")
      // .populate("productoSeleccionado", "nombre precioVenta")
      .populate("creditoAsociado");

    res.status(200).json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las ventas del cliente" });
  }
};

const eliminarVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await Venta.findById(id);

    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // Restaurar stock del producto
    const producto = await Producto.findById(venta.productoSeleccionado);
    producto.stock += venta.cantidad;
    await producto.save();

    // Eliminar venta y crédito asociado
    await Credito.findByIdAndDelete(venta.creditoAsociado);
    await Venta.findByIdAndDelete(id);

    res.status(200).json({ message: "Venta eliminada con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la venta" });
  }
};

module.exports = { registrarVenta, listarVentasPorCliente, eliminarVenta };
