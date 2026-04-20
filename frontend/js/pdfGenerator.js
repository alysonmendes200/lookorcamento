/**
 * pdfGenerator.js
 *
 * Gera o PDF do orçamento usando jsPDF.
 * O timbrado (assets/timbrado.png) é carregado como imagem de fundo.
 * O conteúdo do orçamento é escrito por cima, respeitando a área do timbrado.
 *
 * Uso: await PdfGenerator.gerar(orc);
 */

const PdfGenerator = (() => {

  // Cache do timbrado em base64
  let _timbradoB64  = null;
  let _timbradoW    = 0;  // largura original em px
  let _timbradoH    = 0;  // altura original em px
  let _timbradoRatio = 1; // razão altura/largura para calcular área do timbrado

  const PAGE_W = 210;  // mm A4
  const PAGE_H = 297;  // mm A4
  const BANCO_INFO = 'Banco: 077 - Banco Inter | Agência: 0001 | Conta: 184720184 | CNPJ: 44.954.986/0001-04 | Pix - Chave: 44.954.986/0001-04';

  // ─── Carrega o timbrado uma única vez ──────────────────
  async function loadTimbrado() {
    if (_timbradoB64) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        _timbradoW = img.naturalWidth;
        _timbradoH = img.naturalHeight;
        _timbradoRatio = _timbradoH / _timbradoW;

        // Desenha no canvas para obter base64
        const canvas = document.createElement('canvas');
        canvas.width  = _timbradoW;
        canvas.height = _timbradoH;
        const ctx = canvas.getContext('2d');
        // Fundo branco (caso PNG tenha transparência)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        _timbradoB64 = canvas.toDataURL('image/jpeg', 0.93);
        resolve();
      };

      img.onerror = () => {
        console.warn('Timbrado não carregado — gerando PDF sem fundo.');
        _timbradoB64 = null;
        resolve(); // não bloqueia a geração
      };

      // Tenta PNG primeiro, fallback para JPG
      img.src = 'assets/timbrado.png?' + Date.now();
    });
  }

  // ─── Adiciona o timbrado como fundo da página ──────────
  function addBackground(doc) {
    if (!_timbradoB64) return;
    doc.addImage(_timbradoB64, 'JPEG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');
  }

  // ─── Helpers de formatação ─────────────────────────────
  function fBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ─── Geração principal ─────────────────────────────────
  async function gerar(orc) {
    // Garante que o jsPDF esteja disponível
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      throw new Error('jsPDF não carregado. Verifique o script no HTML.');
    }

    const { jsPDF } = window.jspdf || window;
    await loadTimbrado();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // ── Calcula quanto espaço o timbrado ocupa verticalmente ──
    // O timbrado é a página inteira (210x297mm) mas o conteúdo
    // útil começa após a área do cabeçalho da imagem.
    // Como não sabemos a altura exata do header na imagem,
    // usamos 45mm como estimativa padrão (funciona bem para a maioria).
    const HEADER_H  = 48;  // mm — altura do timbrado/cabeçalho na imagem
    const MARGIN_X  = 14;  // mm — margem lateral
    const MARGIN_B  = 12;  // mm — margem inferior
    const COL_W     = PAGE_W - MARGIN_X * 2; // 182mm de conteúdo

    // ══════════════ PÁGINA 1 ════════════════
    addBackground(doc);

    let y = HEADER_H;

    // ── Linha divisória após o timbrado ──
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 5;

    // ── ORÇAMENTO + NÚMERO ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('ORÇAMENTO', MARGIN_X, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    const numStr = `N° ${String(orc.num).padStart(3, '0')}`;
    doc.text(numStr, PAGE_W - MARGIN_X, y, { align: 'right' });
    y += 2;

    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 6;

    // ── DADOS DO CLIENTE ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('Dados do Cliente:', MARGIN_X, y);
    y += 5;

    const fields = [
      ['Nome:', orc.nome || '—'],
      ['Comércio/Projeto:', orc.comercio || '—'],
    ];
    fields.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(label, MARGIN_X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, MARGIN_X + 38, y);
      y += 5;
    });
    y += 2;

    // ── PROPOSTA ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('Nossa Proposta de Preço:', MARGIN_X, y);
    y += 5;

    const props = [
      ['Prazo de Entrega:', orc.prazo || '—'],
      ['Orçamento Válido:', orc.validade || '—'],
      ['Forma de Pagamento:', orc.pagamento || '—'],
    ];
    props.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(label, MARGIN_X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, MARGIN_X + 44, y);
      y += 5;
    });
    y += 3;

    // ── TABELA DE ITENS — cabeçalho ──
    const COL = {
      num:   { x: MARGIN_X,       w: 8  },
      desc:  { x: MARGIN_X + 8,   w: 96 },
      qty:   { x: MARGIN_X + 104, w: 16 },
      unit:  { x: MARGIN_X + 120, w: 30 },
      total: { x: MARGIN_X + 150, w: 32 },
    };

    // Fundo do cabeçalho
    doc.setFillColor(30, 30, 30);
    doc.rect(MARGIN_X, y - 4, COL_W, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#',          COL.num.x  + 2,  y);
    doc.text('Descrição',  COL.desc.x + 1,  y);
    doc.text('Qtd',        COL.qty.x  + 2,  y);
    doc.text('V. Unit.',   COL.unit.x + 1,  y);
    doc.text('V. Total',   COL.total.x + COL.total.w - 1, y, { align: 'right' });
    y += 5;

    // Linhas dos itens
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const items = orc.items || [];
    items.forEach((item, i) => {
      // Quebra longa descrição
      const descLines = doc.splitTextToSize(item.desc || '', COL.desc.w - 2);
      const rowH = Math.max(6, descLines.length * 4.5);

      // Verifica se precisa de nova página
      if (y + rowH > PAGE_H - MARGIN_B - 40) {
        doc.addPage();
        addBackground(doc);
        y = HEADER_H + 5;
      }

      // Fundo alternado
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(MARGIN_X, y - 3.5, COL_W, rowH, 'F');
      }

      doc.setTextColor(30, 30, 30);
      doc.text(String(i + 1), COL.num.x + 2, y);
      doc.text(descLines, COL.desc.x + 1, y);
      doc.text(String(item.qty), COL.qty.x + 8, y, { align: 'right' });
      doc.text(fBRL(item.unit), COL.unit.x + COL.unit.w - 1, y, { align: 'right' });
      doc.text(fBRL(item.total), COL.total.x + COL.total.w - 1, y, { align: 'right' });

      // Linha inferior da célula
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(MARGIN_X, y + rowH - 3, PAGE_W - MARGIN_X, y + rowH - 3);

      y += rowH;
    });

    y += 4;

    // ── TOTAL GERAL ──
    if (y > PAGE_H - MARGIN_B - 35) { doc.addPage(); addBackground(doc); y = HEADER_H + 5; }

    doc.setFillColor(245, 245, 245);
    doc.rect(MARGIN_X, y - 4, COL_W, 10, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN_X, y - 4, COL_W, 10, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('TOTAL GERAL:', MARGIN_X + 4, y + 2);
    doc.text(fBRL(orc.total), PAGE_W - MARGIN_X - 2, y + 2, { align: 'right' });
    y += 14;

    // Valor por extenso (se disponível)
    if (typeof valorExtenso === 'function') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const ext = '(' + valorExtenso(orc.total) + ')';
      const extLines = doc.splitTextToSize(ext, COL_W);
      doc.text(extLines, PAGE_W - MARGIN_X - 2, y, { align: 'right' });
      y += extLines.length * 3.5 + 3;
    }

    // ── DADOS BANCÁRIOS ──
    if (y > PAGE_H - MARGIN_B - 28) { doc.addPage(); addBackground(doc); y = HEADER_H + 5; }

    doc.setFillColor(240, 240, 240);
    const bancoBlocoH = 16;
    doc.rect(MARGIN_X, y, COL_W, bancoBlocoH, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(MARGIN_X, y, COL_W, bancoBlocoH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('Dados Bancários:', MARGIN_X + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const bancoLines = doc.splitTextToSize(BANCO_INFO, COL_W - 6);
    doc.text(bancoLines, MARGIN_X + 3, y + 10);
    y += bancoBlocoH + 5;

    // ── OBSERVAÇÃO ──
    if (y > PAGE_H - MARGIN_B - 15) { doc.addPage(); addBackground(doc); y = HEADER_H + 5; }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 120);
    const obs = '* Após a aprovação não nos responsabilizamos por erros do Cliente. Por não gostar da arte ou até mesmo erro de digitação. Deixando ciente que o cliente receberá o material para aprovação do mesmo e sendo aprovado será enviado para confecção do mesmo.';
    const obsLines = doc.splitTextToSize(obs, COL_W);
    doc.text(obsLines, MARGIN_X, y);

    // ── DOWNLOAD ──
    const filename = `Orcamento_${String(orc.num).padStart(3,'0')}_${(orc.nome||'').replace(/[^a-zA-Z0-9À-ÿ]/g,'_')}.pdf`;
    doc.save(filename);
  }

  return { gerar, loadTimbrado };

})();
