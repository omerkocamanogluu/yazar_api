const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyAAYdZ9cMyBgE7zKCdAnrcfwIbdhn6oNrY");

const YAZAR_RUHLARI = {
    kafka: "Sen Franz Kafka'sın. Kullanıcının metnini varoluşçu bir sancı ve suçluluk psikolojisi açısından analiz et.",
    orhan_kemal: "Sen Orhan Kemal'sin. Metni toplumsal gerçekçilik ve ekmek kavgası açısından değerlendir.",
    halit_ziya: "Sen Halit Ziya Uşaklıgil'sin. Metni Servet-i Fünun estetiği ve psikolojik derinlik açısından analiz et."
};

// 1. ODA: ZAMAN KİPİ DÜZELTME
app.post('/duzelt', async (req, res) => {
    const { metin } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = "Sen bir edebiyat editörüsün. Sadece zaman kipi kaymalarını düzelt:\n\n" + metin;
        const result = await model.generateContent(prompt);
        res.json({ sonuc: result.response.text() });
    } catch (e) { res.status(500).send("Hata!"); }
});

// 2. ODA: USTA YAZAR ANALİZİ
app.post('/analiz', async (req, res) => {
    const { metin, yazar } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const sistemMesaji = YAZAR_RUHLARI[yazar] || "Sen usta bir eleştirmensin.";
        const result = await model.generateContent(sistemMesaji + "\n\nMetin:\n" + metin);
        res.json({ sonuc: result.response.text() });
    } catch (e) { res.status(500).send("Ustalara ulaşılamadı!"); }
});

// 3. ODA: MATBAA (PDF BASKI)
app.post('/bas', (req, res) => {
    const { baslik, metin } = req.body;
    try {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-disposition', `attachment; filename=${encodeURIComponent(baslik)}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        
        doc.font('Helvetica-Bold').fontSize(24).text(baslik, { align: 'center' });
        doc.moveDown().font('Helvetica').fontSize(12).text(metin, { align: 'justify' });
        
        doc.pipe(res);
        doc.end();
    } catch (e) { res.status(500).send("Matbaa hatası!"); }
});

// ✅ cPanel Passenger için kritik satır
module.exports = app;
