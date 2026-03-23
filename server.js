const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const app = express();
 
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());
 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
 
const YAZAR_RUHLARI = {
    kafka: "Sen Franz Kafka'sın. Kullanıcının metnini varoluşçu bir sancı ve suçluluk psikolojisi açısından analiz et. Sadece istenileni yap herhangi bir giriş veya bitiş cümlesi yapma.",
    orhan_kemal: "Sen Orhan Kemal'sin. Metni toplumsal gerçekçilik ve ekmek kavgası açısından değerlendir. Sadece istenileni yap herhangi bir giriş veya bitiş cümlesi yapma.",
    halit_ziya: "Sen Halit Ziya Uşaklıgil'sin. Metni Servet-i Fünun estetiği ve psikolojik derinlik açısından analiz et. Sadece istenileni yap herhangi bir giriş veya bitiş cümlesi yapma."
};
 
app.post('/duzelt', async (req, res) => {
    const { metin } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "Sen bir edebiyat editörüsün. Sana verilen metindeki zaman kipi kaymalarını düzelt. Çıktı olarak sadece düzeltilmiş metni ver, kesinlikle açıklama yapma veya giriş cümlesi kullanma:\n\n" + metin;
        const result = await model.generateContent(prompt);
        res.json({ sonuc: result.response.text() });
    } catch (e) { console.error("Duzelt hatasi:", e); res.status(500).send("Hata: " + e.message); }
});
 
app.post('/analiz', async (req, res) => {
    const { metin, yazar } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const sistemMesaji = YAZAR_RUHLARI[yazar];
        const result = await model.generateContent(sistemMesaji + "\n\nMetin:\n" + metin);
        res.json({ sonuc: result.response.text() });
    } catch (e) { console.error("Analiz hatasi:", e); res.status(500).send("Ustalara ulaşılamadı: " + e.message); }
});
 
app.post('/bas', (req, res) => {
    const { baslik, metin } = req.body;
    try {
        const doc = new PDFDocument({ 
            margin: 70,
            info: { Title: baslik, Author: 'Yazar Akademisi' }
        });
 
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baslik)}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
 
        const fs = require('fs');
        const fontPaths = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/dejavu/DejaVuSerif.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
        ];
 
        let fontLoaded = false;
        for (const fontPath of fontPaths) {
            if (fs.existsSync(fontPath)) {
                doc.registerFont('TurkishFont', fontPath);
                fontLoaded = true;
                break;
            }
        }
 
        if (fontLoaded) {
            doc.font('TurkishFont').fontSize(22).text(baslik, { align: 'center' });
            doc.moveDown(1.5);
            doc.moveTo(70, doc.y).lineTo(doc.page.width - 70, doc.y).strokeColor('#c9a96e').lineWidth(0.5).stroke();
            doc.moveDown(1.5);
            doc.font('TurkishFont').fontSize(12).fillColor('#1a1a1a').text(metin, { align: 'justify', lineGap: 4 });
        } else {
            doc.font('Helvetica-Bold').fontSize(24).text(baslik, { align: 'center' });
            doc.moveDown().font('Helvetica').fontSize(12).text(metin, { align: 'justify' });
        }
 
        doc.pipe(res);
        doc.end();
    } catch (e) { 
        console.error("Matbaa hatasi:", e);
        res.status(500).send("Matbaa hatası: " + e.message); 
    }
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Yazar Akademisi Motoru Hazır! Port: ${PORT}`));
 
