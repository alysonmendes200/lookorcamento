# Frontend — Sistema de Orçamentos

## Arquivos
| Arquivo | Função |
|---|---|
| `index.html` | Tela de login |
| `app.html` | Sistema principal |
| `style.css` | Estilos |
| `js/config.js` | ⚠️ URL do backend — **EDITE ANTES DE PUBLICAR** |
| `js/api.js` | Cliente HTTP |
| `js/utils.js` | Utilitários (formatação, toast, etc) |
| `js/pdfGenerator.js` | Geração de PDF com jsPDF + timbrado |
| `assets/timbrado.png` | Imagem do timbrado usada no PDF |
| `netlify.toml` | Configuração do Netlify |

## Configuração obrigatória

Edite `js/config.js` com a URL do seu backend:
```js
const CONFIG = {
  API_BASE: 'https://SEU-BACKEND.onrender.com'  // ← altere aqui
};
```

## Deploy no Netlify
1. Arraste a pasta `frontend` para o [Netlify](https://netlify.com)
2. Aguarde o deploy
3. Copie a URL gerada

## Personalizar o timbrado
Substitua o arquivo `assets/timbrado.png` pela sua imagem.
- Tamanho ideal: A4 (2480 x 3508 px) a 300dpi
- Formato: PNG ou JPG
- Se usar JPG, edite a linha `img.src` em `js/pdfGenerator.js`
