const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');
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
 
// PDF - font gömülü (Noto Serif fonts/ klasöründen)
app.post('/bas', (req, res) => {
    const { baslik, metin } = req.body;
    try {
        const doc = new PDFDocument({ 
            margin: 70,
            info: { Title: baslik, Author: 'Yazar Akademisi' }
        });
 
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baslik)}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
 
        const regularFont = path.join(__dirname, 'fonts', 'NotoSerif-Regular.ttf');
        const boldFont    = path.join(__dirname, 'fonts', 'NotoSerif-Bold.ttf');
        const fontExists  = fs.existsSync(regularFont) && fs.existsSync(boldFont);
 
        if (fontExists) {
            doc.registerFont('Serif',     regularFont);
            doc.registerFont('SerifBold', boldFont);
            doc.font('SerifBold').fontSize(22).text(baslik, { align: 'center' });
            doc.moveDown(1.5);
            doc.moveTo(70, doc.y).lineTo(doc.page.width - 70, doc.y).strokeColor('#c9a96e').lineWidth(0.5).stroke();
            doc.moveDown(1.5);
            doc.font('Serif').fontSize(12).fillColor('#1a1a1a').text(metin, { align: 'justify', lineGap: 4 });
        } else {
            doc.font('Helvetica-Bold').fontSize(22).text(baslik, { align: 'center' });
            doc.moveDown(1.5);
            doc.font('Helvetica').fontSize(12).text(metin, { align: 'justify' });
        }
 
        doc.pipe(res);
        doc.end();
    } catch (e) { 
        console.error("Matbaa hatasi:", e);
        res.status(500).send("Matbaa hatası: " + e.message); 
    }
});
 
// EPUB - gerçek EPUB3 formatı, Amazon KDP uyumlu
app.post('/epub', async (req, res) => {
    const { baslik, metin, yazar } = req.body;
    try {
        const bookId = 'yazar-akademisi-' + Date.now();
        const paragraflar = metin.split('\n').filter(p => p.trim());
        const paragrafHTML = paragraflar.map(p => `<p>${p.trim()}</p>`).join('\n');
 
        const zip = new JSZip();
 
        // mimetype - sıkıştırılmamış olmalı
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
 
        // META-INF/container.xml
        zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
 
        const oebps = zip.folder('OEBPS');
 
        // content.opf
        oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="tr">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${bookId}</dc:identifier>
    <dc:title>${baslik}</dc:title>
    <dc:language>tr</dc:language>
    <dc:creator>${yazar || 'Yazar Akademisi'}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav"    href="nav.xhtml"     media-type="application/xhtml+xml" properties="nav"/>
    <item id="text"   href="text.xhtml"    media-type="application/xhtml+xml"/>
    <item id="style"  href="style.css"     media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="text"/>
  </spine>
</package>`);
 
        // nav.xhtml
        oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr">
<head><meta charset="UTF-8"/><title>${baslik}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>İçindekiler</h1>
    <ol><li><a href="text.xhtml">${baslik}</a></li></ol>
  </nav>
</body>
</html>`);
 
        // style.css
        oebps.file('style.css', `
body { font-family: Georgia, serif; font-size: 1em; line-height: 1.8; margin: 5% 8%; color: #1a1a1a; }
h1 { font-size: 1.6em; text-align: center; margin-bottom: 2em; font-weight: bold; }
p { text-indent: 1.5em; margin: 0 0 0.5em 0; text-align: justify; }
p:first-of-type { text-indent: 0; }
`);
 
        // text.xhtml - ana içerik
        oebps.file('text.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>${baslik}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${baslik}</h1>
  ${paragrafHTML}
</body>
</html>`);
 
        const epubBuffer = await zip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
 
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baslik)}.epub`);
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Length', epubBuffer.length);
        res.send(epubBuffer);
 
    } catch (e) {
        console.error("EPUB hatasi:", e);
        res.status(500).send("EPUB hatası: " + e.message);
    }
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Yazar Akademisi Motoru Hazır! Port: ${PORT}`));
 
