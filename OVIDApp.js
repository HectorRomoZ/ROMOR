import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import emailjs from "emailjs-com";

const radiationFactors = {
  "CDMX": 4.7,
  "Jalisco": 5.5,
  "Nuevo León": 5.3,
  "Yucatán": 5.8,
};

const OVIDApp = () => {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    consumo: "",
    estado: "CDMX",
  });
  const [resultado, setResultado] = useState(null);
  const [data, setData] = useState([]);

  const precioUSD = 462;
  const tipoCambio = 20;
  const perdida = 0.0005;
  const potenciaPanel = 450;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calcular = () => {
    const consumoMensual = parseFloat(form.consumo);
    const consumoAnual = consumoMensual * 12;
    const irradiacion = radiationFactors[form.estado];
    const energiaPanelAnual = ((potenciaPanel / 1000) * irradiacion * 365) * (1 - perdida);
    const numPaneles = Math.ceil(consumoAnual / energiaPanelAnual);

    const generacionMensual = ((potenciaPanel / 1000) * irradiacion * 30) * (1 - perdida) * numPaneles;
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const comparativa = meses.map((mes) => ({
      mes,
      consumo: consumoMensual,
      generacion: parseFloat(generacionMensual.toFixed(2))
    }));

    const potenciaTotal = numPaneles * potenciaPanel;

    setResultado({ numPaneles, potenciaTotal });
    setData(comparativa);
  };

  const exportarPDF = async () => {
    const input = document.getElementById("reporte");
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 190, 0);
    pdf.save("cotizacion_solar.pdf");
  };

  const enviarCorreo = async () => {
    if (!resultado || !form.email) {
      alert("Por favor llena todos los campos, incluido el correo electrónico.");
      return;
    }

    const input = document.getElementById("reporte");
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 190, 0);
    const pdfBlob = pdf.output("blob");

    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    reader.onloadend = () => {
      const base64data = reader.result.split(",")[1];

      const templateParams = {
        nombre: form.nombre,
        telefono: form.telefono,
        estado: form.estado,
        consumo: form.consumo,
        numPaneles: resultado.numPaneles,
        potenciaTotal: resultado.potenciaTotal,
        reply_to: form.email,
        attachments: JSON.stringify([
          {
            content: base64data,
            filename: "cotizacion.pdf",
            type: "application/pdf",
            disposition: "attachment"
          }
        ])
      };

      emailjs.send(
        "service_xnhyvrf",
        "template_xa3ovwj",
        templateParams,
        "lalYii5lLGBZthdOU"
      )
      .then((response) => {
        alert("Correo enviado con PDF adjunto.");
      })
      .catch((error) => {
        alert("Error al enviar el correo.");
        console.error(error);
      });
    };
  };

  return (
    <div className="p-4">
      <h1>Cotizador Solar - OVID</h1>
      <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} />
      <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} />
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
      <input name="consumo" placeholder="Consumo mensual (kWh)" value={form.consumo} onChange={handleChange} />
      <select name="estado" value={form.estado} onChange={handleChange}>
        {Object.keys(radiationFactors).map((estado) => (
          <option key={estado} value={estado}>{estado}</option>
        ))}
      </select>
      <button onClick={calcular}>Calcular</button>

      {resultado && (
        <div id="reporte">
          <p>Nombre: {form.nombre}</p>
          <p>Teléfono: {form.telefono}</p>
          <p>Email: {form.email}</p>
          <p>Estado: {form.estado}</p>
          <p>Consumo mensual: {form.consumo} kWh</p>
          <p>Número de paneles: {resultado.numPaneles}</p>
          <p>Potencia total instalada: {resultado.potenciaTotal} W</p>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="consumo" stroke="#8884d8" />
              <Line type="monotone" dataKey="generacion" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>

          <button onClick={exportarPDF}>Exportar PDF</button>
          <button onClick={enviarCorreo}>Enviar por correo</button>
        </div>
      )}
    </div>
  );
};

export default OVIDApp;
