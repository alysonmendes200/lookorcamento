/**
 * docxGenerator.js
 * Gera orçamento em .docx com timbrado (imagem) embutido
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, HeadingLevel
} = require('docx');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'timbrado.png');
const BANCO_INFO = 'Banco: 077 - Banco Inter | Agência: 0001 | Conta: 184720184 | CNPJ: 44.954.986/0001-04 | Pix - Chave: 44.954.986/0001-04';

function fBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function valorExtenso(v) {
  const inteiro = Math.floor(v);
  const cents = Math.round((v - inteiro) * 100);
  const un = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dez = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const cen = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function g(n) {
    if (!n) return '';
    const c = Math.floor(n/100), resto = n%100, d = Math.floor(resto/10), u2 = resto%10;
    if (n===100) return 'cem';
    let t = c ? cen[c] : '';
    if (resto && c) t += ' e ';
    if (resto < 20) t += un[resto];
    else { t += dez[d]; if (u2) t += ' e ' + un[u2]; }
    return t;
  }
  function montar(n) {
    if (!n) return 'zero';
    let t = '';
    const bi = Math.floor(n/1e9), mim = Math.floor((n%1e9)/1e6), mil = Math.floor((n%1e6)/1e3), c2 = n%1e3;
    if (bi) { t += g(bi) + (bi===1?' bilhão':' bilhões'); }
    if (mim) { if(t) t+=' e '; t += g(mim) + (mim===1?' milhão':' milhões'); }
    if (mil) { if(t) t+=' e '; t += (mil===1?'mil':g(mil)+' mil'); }
    if (c2) { if(t) t+=' e '; t += g(c2); }
    return t;
  }
  let r = montar(inteiro) + (inteiro===1?' real':' reais');
  if (cents) r += ' e ' + montar(cents) + (cents===1?' centavo':' centavos');
  return r;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: '444444' };
const borderThin = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

async function gerarDocx(orc) {
  const children = [];

  // ---- TIMBRADO (imagem de cabeçalho) ----
  if (fs.existsSync(LOGO_PATH)) {
    const logoData = fs.readFileSync(LOGO_PATH);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: logoData,
            transformation: { width: 595, height: 160 }, // largura A4 menos margens
            type: 'png'
          })
        ]
      })
    );
  }

  // ---- TÍTULO + NÚMERO ----
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '222222' } },
      children: [
        new TextRun({ text: 'ORÇAMENTO', bold: true, size: 48, font: 'Arial' }),
        new TextRun({ text: `   N° ${String(orc.num).padStart(3, '0')}`, bold: true, size: 28, font: 'Arial', color: '555555' })
      ]
    })
  );

  // ---- DADOS DO CLIENTE ----
  children.push(
    new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: 'Dados do Cliente:', bold: true, underline: {}, size: 24, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Nome: ', bold: true, size: 22, font: 'Arial' }), new TextRun({ text: orc.nome, size: 22, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Comércio/Projeto: ', bold: true, size: 22, font: 'Arial' }), new TextRun({ text: orc.comercio, size: 22, font: 'Arial' })] })
  );

  // ---- PROPOSTA DE PREÇO ----
  children.push(
    new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: 'Nossa Proposta de Preço:', bold: true, underline: {}, size: 24, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PRAZO DE ENTREGA: ', bold: true, size: 22, font: 'Arial' }), new TextRun({ text: orc.prazo, size: 22, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ORÇAMENTO VÁLIDO: ', bold: true, size: 22, font: 'Arial' }), new TextRun({ text: orc.validade, size: 22, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'FORMA DE PAGAMENTO: ', bold: true, size: 22, font: 'Arial' }), new TextRun({ text: orc.pagamento, size: 22, font: 'Arial' })] })
  );

  // ---- TABELA DE ITENS ----
  const PAGE_WIDTH = 11000; // A4 com margens
  const colWidths = [500, 5900, 1000, 1800, 1800];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      ['#', 500], ['Descrição do Produto / Serviço', 5900], ['Qtd', 1000], ['V. Unit.', 1800], ['V. Total', 1800]
    ].map(([text, w]) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { fill: '222222', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: text === '#' || text === 'Qtd' ? AlignmentType.CENTER : (text.includes('V.') ? AlignmentType.RIGHT : AlignmentType.LEFT), children: [new TextRun({ text: String(text), bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })] })]
    }))
  });

  const itemRows = orc.items.map((item, i) => new TableRow({
    children: [
      new TableCell({
        width: { size: 500, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR },
        borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i+1), size: 20, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 5900, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR },
        borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: item.desc, size: 20, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 1000, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR },
        borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.qty), size: 20, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 1800, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR },
        borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fBRL(item.unit), size: 20, font: 'Arial' })] })]
      }),
      new TableCell({
        width: { size: 1800, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR },
        borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fBRL(item.total), size: 20, font: 'Arial' })] })]
      })
    ]
  }));

  children.push(
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, ...itemRows]
    })
  );

  // ---- TOTAL ----
  const totalExt = valorExtenso(orc.total);
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({ text: 'TOTAL GERAL: ', bold: true, size: 28, font: 'Arial' }),
        new TextRun({ text: fBRL(orc.total), bold: true, size: 28, font: 'Arial', color: '000000' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: `(${totalExt})`, size: 20, font: 'Arial', color: '555555', italics: true })]
    })
  );

  // ---- DADOS BANCÁRIOS ----
  children.push(
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [PAGE_WIDTH],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: PAGE_WIDTH, type: WidthType.DXA },
          shading: { fill: 'F0F0F0', type: ShadingType.CLEAR },
          borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Dados Bancários:', bold: true, size: 22, font: 'Arial' })] }),
            new Paragraph({ children: [new TextRun({ text: BANCO_INFO, size: 20, font: 'Arial' })] })
          ]
        })]
      })]
    })
  );

  // ---- OBSERVAÇÃO ----
  children.push(
    new Paragraph({
      spacing: { before: 200 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
      children: [
        new TextRun({
          text: '* Após a aprovação não nos responsabilizamos por erros do Cliente. Por não gostar da arte ou até mesmo erro de digitação. Deixando ciente que o cliente receberá o material para aprovação do mesmo e sendo aprovado será enviado para confecção do mesmo.',
          size: 16, font: 'Arial', color: '777777', italics: true
        })
      ]
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { gerarDocx };
