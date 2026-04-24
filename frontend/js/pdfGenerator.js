/**
 * pdfGenerator.js
 * Gera PDF e DOCX do orçamento com o timbrado e logo da Look
 */
const PdfGenerator = (() => {

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MX     = 13;   // margem lateral mm
  const COL_W  = PAGE_W - MX * 2;
  const AZUL   = [0, 51, 153];   // azul Look
  const BANCO_INFO = 'Banco: 077 - Banco Inter | Agência: 0001 | Conta: 184720184 | CNPJ: 44.954.986/0001-04 | Pix - Chave: 44.954.986/0001-04';

  // Logo Look em base64 (embutida para funcionar offline e sem CORS)
  const LOGO_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACCAN4DASIAAhEBAxEB/8QAHAABAAIDAQEBAAAAAAAAAAAAAAQFAgMGAQcI/8QARBAAAQQBAQQFCAcGBQQDAAAAAQACAwQFEQYSITETQVFhcRQiIzKRscHRFjRScoGh8BUzQlTC4TVDYnOSNlNV0oKisv/EABsBAAEFAQEAAAAAAAAAAAAAAAMAAgQFBgcB/8QAOxEAAQMCAwQGCQIFBQAAAAAAAQACAwQRBSExEkFRYRMycZGhsQYUIoHB0eHw8RUzIyQ0QlIlU2Jyov/aAAwDAQACEQMRAD8A/Pug7FovwxTU5Y5GNc0sPMdy3rCx9Xk+4fcuuStDmEEbli2EhwIXzdERcjW0REXVbN4VsbG3LbNZDxjYf4R2nvU2goJa2Xo4/eeCj1NQynZtOVfi9n7NoNksHoIjx4jzj+HV+K6GphcdW0La4kd9qTzv7KwRb6jwalpRk254nP8ACzs9dNMdbDgFiyKJnqRsb4NAWMlevJwkgif95gK8tWYKsRlsStjZ2nr+aj0stQty9FDOC/qDgRr4a81MfLTtcInEXO7LyUdrJCNsA24qLc2ex84Jja6B562Hh7FzWUxNvHnekaHxa6CRvL8exd4vJGMkY5j2hzXDQgjUFVtdgNNUtJYNl3EfEKXT4jLEfaNwvmzWlzg1oJJOgAHEq/xmzcsoEl15ib9hvrH5K7x+HpUrD54mEvJ83eOu4OwKwVfh3o2xnt1WZ4DT3qTU4oXZRZc1Cq4nH1h6Oqwn7TxvH81LbHG0aNY1o7AFki00cEUQsxoHYFUuke83cbrTLUqygiStE8HtYFVXtm6crSaxdA/q46t9hV2iDUUNPUC0jAfPvRI6iWI3a5fPsjj7VCTcsR6A+q4cWu8Coq+j2YIbMLoZ2B7HcwVxGcxr8dZ3Rq6F/GNx9x71icXwR1H/ABI82eI++Kv6KvE/sOyd5q12H9a34M+K6bQdi5nYf1rfgz+pdMtRgH9Az3+ZVRiX9S73eS5PbOCKO1BLGwNdI072g01004/mqBdJtx+8qeDvgufrQS2Z2QwsLnuOgCx+NR/6g9rBqR4gK7oXfyzS4/d1soVJrtlsELdXHmeoDtK7rG0YaFVsEQ163OPNx7Vqw2Oix1bcbo6R3GR/afkpy1mC4QKNnSSdc+HL5qmrq0zu2W9UeKaDsVJtHkqtYsrugjsSa7xa7k0fNb8/lWY+HcjIdYePNH2e8ripHvkkdJI4uc46knmSouO4uIB0EWbt/L6o2H0RkPSP03c19JWFj6vJ9w+5ZrCx9Xk+4fctK/qlVTdQvm6Ii5CtqrfZah5Xf6WRusUPnHXkT1BdoqrZWv0GIjcR50pLz8PyCtV0nBKQU1I3i7M+/TwWWxCYyzHgMkREVuoSo7EbLe1IgtAOiih3o2Hk48P7+xTMnia1uDSNjYZm8Y5GDTQ/gsc5QksBlqq7ctwcWEfxDsWzD5Bl+vqRuTM4SsPMH5KmZDF00kE7bl5JB4jhfi36hTnPfsNkjPVyPL8rThchJK91G6Ny5FwOv8Y7QrRV2axxttbYru6O3FxjeOGvcV7hciLsTmSN6OzFwlYeHHtUimlfC/1eY3P9p4jgeY8dUKVjZG9Kz3jh9FYIigZbJxUQI2tMtl/BkTeZ8VMmmZAwvkNgEBkbpHbLRmp5IHMgeKKjhw0l3Wzl5Xuld6sbDoGDs/X5r2gZsZlmY6SZ0taZpMJeeLSOr9dyhNrpQWmSPZa42Bvnnpcbr9p5qQadhBDXXI+8irtERWSioo2UqMvUpK7tNSNWnsd1FSUTJI2yMLHC4K9a4scHDULm9i2PimuxvaWuaWhwPUfOXSKvqQtgzlsj/PjZIPw1B+HtVgoOFQer0wiP9pcPE/BSKyTpJdviB5Lmts2PlsU442lz3bwAHMngrLAYpmPg3n6OsPHnu7O4KyLWlzXFoLm8iRxC9TY8MjbVvqnZk6csrd69dVuMLYRkBrzRQc1kosdW3zo6V3CNnae09y2ZS9DQqmaU6nkxo5uK4W9amuWXTzu1c7q6gOwKJjWLijZ0cfXPhz+SPQURndtO6o8VhYmlsTummeXvcdSStaIufOcXG51WkAAFgvpawsfV5PuH3LNYWPq8n3D7l11/VKxbdQvm6Ii5CtqvoeMbuY2s0dULfcFIUTCvEmJquB19E0fiBp8FLXWqYgwsI0sPJYyUEPN+KIiIyYipsxTmr2P2rQHpW/vYxye3rVyij1NM2oZsnI6g7weIRIpTE64/Kj465DeqtnhPA8COtp7CoGaoytlbk6HCzH6zR/mNWm9DJh7hyFRpdVkPp4h1d4V1XmjsQsmicHMeNQQoTf5thp58nt4eDm/eWhRz/BcJY82n7IKgR5CW7inT45jXWPVLHH1T1piMWKrjZsP6a2/i6Q8dO4KNkq02OuHKUWFzHfWIh1jtH6+K2S7RUBEHRdJLI4cIw0g69h/RQBNEyS9a6z2aX0P/ACaOJ7wimN7m2gHsu7+w8lZXLMNSB007wxg/PuCqcYyfI5IZWdhihY0trsPM69aVMfYvzi7luQ4x1+pvj+vkrsAAaDgFJYySseJJBssBuBvJ3E8OQ70JxbA0tabuOp3DkPmiIis1ERERJJQ5hu5ms77UMjT+BaVMUN/n5uPsjruP/Jw/9SpijwdZ55/AfFEk0b2fEotdmVsFeSZwcWsaXENGpWxEdwJBtqhi1818/wApemyFozSnQcmN6mhRFf7TYfydzrlVvoSfPaP4D2+CoFy3EIJ4ahzZ83cePNa+mkjkjBj0RERQkdfS1hY+ryfcPuWa8cA5paeRGhXX3C4IWJBsV81RX82y9wSHop4HM6i4kH3LD6MZD/u1v+TvkuZnB64G3RlasV1Of7grDYy0H05KjnedG7eaP9J/v71frlqWGyeNsC4x0MnR8XMY46uHWBwXS1Z4rMDJ4XbzHDh8ltMGklbAIJ27Lm8d4+mioq5rDIZIzcHzWxERXKgoiIkkvHNa5pa4BzSNCDyIVD6TA2ydHvx0p14cTEVfrx7WvaWuaHNPAgjUFRKql6azmmz26H4HiDvCNDLsXBFwdR971WWc7Rja0QOdZkd6rIwdSp8cEDX9M2vGyQ8S4MAd7V5BTqwPL4a0Ubj1tYAVuXsEc1y6cg8ABp35pSOZpGCO1ERFKQURESSREVLtRk21axqxO9PKNDp/C3tUerqWUsRlfoPuyJDE6Z4Y3essJaFvL5GVp1YNxrD3DUf3VwuZ2H9a34M/qXTKHg0rpqNsjtSXH/0UeuYGTlo3W8goGTycdCzXjmb6OXXefr6umnV+KntIc0OaQQRqCOtcxtx+8qeDvgtWzOY6Bzadp3oidGPP8B7D3KH+sCHEH00x9nKx4ZDVH9R26ZsrNd/euscA5pa4AgjQg9a4zaLEGjJ08AJrPP8AwPZ4Ls1jLGyWN0cjQ5jhoQetT8Sw6Oui2Tk4aHh9FGpap1O+403r5siss9i346fVuroHnzHdnce9Vq5tPBJTyGOQWIWqjkbI0OacivpaLnK21EYhaJ67zIBoS0jQ962fSir/AC03tC6I3HKEi/SeazBw+oBtsq/RUH0oq/y03tCfSir/AC03tCd+tUP+4PH5Lz1Co/xV+q+evPUndaot32vOs0Gum8ftN7D71A+lFX+Wm9oWE+1EXRO6GtJv6cN4jQIM+K4fI3OTMaEXuOzJEjo6lp6uquqVyvcj34JA77TTwc3xCkL5xFNLFKJYpHMeDrvNOhVxU2luxaCdkc47SN0+0fJQKP0nicLVAseIzHz81Inwl4N4zcLr0XOs2phPr1JG+DwVjJtUz/LpOP3pNPgrM47QAX6TwPyUT9Pqb9XyXSKuy+XrUGFu8JJ+qMHl49i5q5n8hYBaJBCw9UY0Pt5qqJJOp4lU1d6TCxbTDPifgPn3KdT4Sb3lPuCvsdtHYjtONz0kTzqdBxZ4d3cuprWIbMQlglbIw9YK+cLdVsz1ZOkryujd2g8/HtUDD/SGan9mb2m+I+ak1OGMlzZkfBfRUXJ1dp7TBpYhjm7wd0/JS27UwaedUkB7nArSx4/QvFy+3aCqp2G1DT1broUXNS7VcCIqfHqLpPhoqq9mchbaWPm3IzzZGNB80Go9I6OMewS48hbzT48LncfayXRZrOwVGmKsWzT8uB1a3x+S4+eWSeV0sry97jqSetYIsfiGJzVz7vyA0G5XdNSMpxZuvFdLsP61vwZ/UumXC4LJnGzvcY+kjkGjgDoeHIq7+lFX+Wm9oWmwXFaSGjbHI+xF+PG6qq+jmknLmtuCo+3H7yp4O+C5tWWdyf7SnY5sfRsjGjQTqTrzKrVmcWnZUVj5IzcG3kArWjjdHA1rtV0+zGY13aNp/HlE89f+k/BdIvmi6LG7SmKu2K3E+VzeAe08SO9X2DY61jOhqTpofgVXV2HFztuIa6hdLagiswOgmYHMcNCFwuYx0uOsmN+ro3cWP+0Pmr/6UVf5ab2hQ8tn4LcDY2VN7R296TTTkUTGJ8OrYtoSDbGmR7k2hjqoH2LfZK59ERYxXqIiJJIiIkkiIiSSIiJJIiIkkrqrUjtYujFwY6Ww5peG8dNF5+zMf0InN+ToxL0J9Fx3+7jyUSrkpa8VeNsbCIJDI3XXiT2rX5bJ5L5PuN3en6fXr10008FcesUmwNptzbnuA4Eb7qF0U20bGwvy4n6KacVBCyxJbtOY2Cbo/NZqXcNRovWYeIzP1t6VxAJ2S7nNuvWO1ZjLMdRsPmihklmsBxicDpu7vMfiFElys8jpiY4w2SHoQ0DQMb3Ikhw9lrC/fffrn2c0xoqXXz8uWnipjKDLUVCETgRP6YteI9Do08z2rCPF0Hsgkbek3bDujj9Fx3tdOPHlyUWvlJoWVmtjjIrh4brrx3+eq1xX5I4qsYYwitJ0je86g8fYmesUZsXNubDjuDRx/wC3gndFONDbXhxP0VhFj3SwVqkkjG62ZIyWsGoIHb18lpdi4pYmOpWTKTMIXbzN3QnrHcsGZedsrJBHHqyZ8w583cx4LRDfmhgMUYa30wlDusELx01EQARfnnfIC1t2t0gyoGd/u5VlDUoxVsgIbHTyRwkODo9NDrzC1HEQ9J5J5WfLgze6Pc83XTXd17dFqly73xTsbUrRmdukjmtIJPbzQ5ifo9ehg8o3Nzp93z9OXt70R01CbAjTgDxN7Z3vpYnLVNDKgXIPlwHhrzXmAYx81oPY12lV5Go10PDipOOx9WK1SFmz6eXdkEfR6t0PIE9pVZRtPqOlcxrXGSN0Z16gVLr5iWJsJdWryywgNZI9p3g0dSFST0zWMEuo5HiOG+2m5PmjlJdsaFSWYcTvmneZWsdO9rGxRb2gBPE9gWLsbOypJT3oy/yxsYO5xOreB17NOpRoctK1r2SQQzMdIZGteD5pPPTQ8lrbkZ2xFjGsYTOJgWjkRyA7kQz0NgQDc3vr+OzxTRHUXzKkvxtMxWjBdfI+s0lzTHpqR2ceSXsTHWrxvE0ry7TzmxasOo14EFYS5d74p2NqVozO0iRzWnUnt5rKPN2IYtyvBXhJ03ixvraDTlyC8L8PNwRu3B3E7ieFt4SDan7t8lVIisNnY2y5qsx4BG8Xce4E/BVUERmlbGN5A71MkfsMLjuUmvgX9C2W9biph3IP5+8LZ+xcd/5yv/8AX/2UXKmxfzssLdXv6UxsHUADp/dS3YfGwOEFrKNZYPMAcAe/9BXjIIXOc2KEFrTbac4i57wPcoDpJAAXyWJzsBf5rz9gQyginlK88mnq8PgSqaxDLXmdDMwskadCCrW3XixMEkM0Tn2XkPr2GHQAcPYfmtm1WksOPtkAPmh1dw7gfig1dJF0TnNbsPZa4uTqbb9+hyJFinwzP2wCbtOh8dyokVrs9RgvSWGz72jI95u6dOKqlVvp3sjbIdHXt7lLbIHOLBqPiiLJ7Hs032Obry1GixQSCNUREWTmPaAXMcAeRI5qx2cpQX7z4Z97dEZcN06cdR80WCnfPK2JupQ5JGxsLzoFWIspBpI5o5AkKZjW450Ng3nva8NHRAA8Tx7B4LyKIyP2LgduQXr37Ldq11BRFa4LHw222vKGvBjj3m6HTtTqenfUSCNmp/K8lkbE3acqpEWT2PYdHtc0940QbFEWKKdUbjjj53WJHi0NeiAB0PDwUJrXPOjWlx7ANUR8RaGm4N+HxTGvuTlovEXrmuadHAg9hC9Yx7zoxrnHuGqHY3sn3WKLZAzesxxvBALwD7VOz9KKnkOgrteWbgdxOqM2ne6IyjQEDv8AwhmVoeGbyq1EXoBJ0AJKAiLxERJJFZ7L/wCO1/8A5f8A5KrFLxFltTJQWH+q13neBGh96k0T2x1Mb3aBwPihTtLonNG8FWeLkjj2tn6TQb0sjWk9pJVfkaV1mQlY+GR73PJBDSd7U8wpucxVoXn2qsbp4pXdI10fEgnj1LOK/tFHF0fk87tBoHOgJPuVvLELOgna4WcSCBe9/vIqEx+kkZBuACCbaJtEDDicfVmINhjdSNeIGnL9di82k/wvEf7H9LFFbjstft700M284+c+VpaB7Vu2pmiM1elC7ebVj3Ce/h8glO9zoZ5XNLQQ1rb6mxHwGaUbQJI2g3IuTbn+Vt2O/e2/9pebNxxQ0reSfGJJIBpGD1HTn7lEweQjx753SMe/pGbo3epY4bJGg+Rr4xLBKNJGJtLVQMbAHnq7fuJ0K9mhkcZLDW3vtqFa4fJy5Ww+jfjjljkaSNG6bpC04CpDFavzytEvkeu6D1ka8fyXjMrjKTHvxlORs7xpvSHg38yoGJyUlC06Ut6Vkg0kaT6390X1uJskPTvD3NJu7WwOnbY5pnQvLX9G3ZBtl59l9Fa4rMT5C+KdyOKSGbUbu76vDVNnYG1tpLcDDq1jHAeG8FpjymIqOdPRoyCwQQN8+a38yomGyYp5GW3Ya+QyNIO7z1JB1/JPZWRskh6aQPcHE7WeQ4Xtxz5JroHOa/o27II05q1yMZxGKJoaOdK8tmnB4juHZ1ju8VF2X+o5T/aHuco2LykdeOxWsxOlrTandHMH9e5Y4rIQ0obsRZI8Tt3WHhw58/amNrIDUxSh1mgEbP8AibEePHXinGCQRPYRc3GfHMeSl7PsirYy1lHRNkkiO7GD1Hhx/MKbhMnayENxtjcIZHqN1unPVU+FybKbJa9mIzVph5zRzCmwZfGVI5oadOZrZG6FxPEn28kShrI42RWkDWgHabncnPPTPd2JtRA5zn3Zcm1jwCy2WrtFKzdb0PTtO5G6U6NZwHH81NIfZozwZO5QlJbrE6N41afyVDh8kKQlhmi6atMNHs+IW6xawjIJG1aErpHt0Bldwb3jiV5S1sLKVrQQLAggki5PIA3+CU0EhmJIOZFiLZeOS34f/pnI+PwC9wAvx4+SSKetVrl/72UcSewd3ioVHIR18TapuY8vm5OHIcFuo5KmcWMfkIJXxsdvMdGePv7yhU9TDeK77FrCNSM7nIkaZIkkT7P9m93DnlZT9oWtmwcViSWGeZkm70sY4EceCzxEokw8UONswQWgfSNeOLiq2/lKkuJFCtWfC1r9W6nXh396xqWcKascdulMJWDi+N3rePEI5rY/W9tjhmwAm5Ge+zrXvzOqEIHdDsuB15Hw0XuV8u/bFc32Ma/VoaWDg4a81abQZixQyDYYGR6boc4uGpcqjK5Rty5BIyIsig03QTqTx6/Yp1nKYW1OLNinYfKABodN06fimsqWDpmwzWJcCCb5jO+78pzonHYL472ByCx2gghbkKNqJgYbGjnNHbqOP5qVtFlpaNzoK0UYc5gL3kcTz0VJkck+7kGWZG7rIyN1gPIA6+1M5ejyF7p42OY3cDdHc0KbEWNbM6ndYucLdxueVz5pzKVxMYkF7A/RQERFnlZoiIkkuj2PlkL3RmR5YDwbvcB+C6hEXS8F/o2diylf++5VO00skVFxjkew6c2u0XFIizfpR++3sVrhP7ZRERZhWyIiJJIiIkkiIiSSIiJJIiIkkiIiSSIiJJIiIkkiIiSSIiJJL//Z';

  // Cache do timbrado de fundo
  let _bgB64 = null;

  async function loadBg() {
    if (_bgB64) return;
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
        ctx.drawImage(img,0,0);
        _bgB64 = c.toDataURL('image/jpeg', 0.92);
        resolve();
      };
      img.onerror = () => { _bgB64 = null; resolve(); };
      img.src = 'assets/timbrado.png?' + Date.now();
    });
  }

  function fBRL(v) {
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }

  // ── Desenha cabeçalho padrão Look numa página PDF ──────
  function drawHeader(doc, numStr) {
    // Fundo do timbrado (se disponível)
    if (_bgB64) {
      doc.addImage(_bgB64,'JPEG',0,0,PAGE_W,PAGE_H,undefined,'FAST');
    } else {
      // Cabeçalho gerado por código se não tiver timbrado
      doc.setFillColor(...AZUL);
      doc.rect(0, 0, PAGE_W, 28, 'F');
    }

    // Texto ORÇAMENTO e número no cabeçalho
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    doc.setTextColor(255,255,255);
    doc.text('ORÇAMENTO', PAGE_W/2, 13, {align:'center'});
    doc.setFontSize(10);
    doc.text(numStr, PAGE_W - MX, 13, {align:'right'});

    // Linha abaixo do cabeçalho
    const headerBottom = _bgB64 ? 32 : 30;
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.6);
    doc.line(MX, headerBottom, PAGE_W - MX, headerBottom);

    return headerBottom + 5;
  }

  // ── PDF ────────────────────────────────────────────────
  async function gerarPDF(orc) {
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFClass) throw new Error('jsPDF não carregado.');

    await loadBg();

    const doc = new jsPDFClass({ unit:'mm', format:'a4', orientation:'portrait' });
    const numStr = 'N° ' + String(orc.num).padStart(3,'0');

    let y = drawHeader(doc, numStr);

    // ── Dados do Cliente ──
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...AZUL);
    doc.text('DADOS DO CLIENTE', MX, y);
    y += 1;
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.2);
    doc.line(MX, y, MX + 50, y);
    y += 4;

    const dadosCli = [
      ['Nome:', orc.nome||'—'],
      ['Comércio/Projeto:', orc.comercio||'—'],
    ];
    dadosCli.forEach(([label, val]) => {
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
      doc.text(label, MX, y);
      doc.setFont('helvetica','normal');
      doc.text(String(val), MX+40, y);
      y += 5;
    });
    y += 2;

    // ── Proposta ──
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...AZUL);
    doc.text('NOSSA PROPOSTA DE PREÇO', MX, y);
    y += 1;
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.2);
    doc.line(MX, y, MX + 70, y);
    y += 4;

    const props = [
      ['Prazo de Entrega:', orc.prazo||'—'],
      ['Orçamento Válido:', orc.validade||'—'],
      ['Forma de Pagamento:', orc.pagamento||'—'],
    ];
    props.forEach(([label, val]) => {
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
      doc.text(label, MX, y);
      doc.setFont('helvetica','normal');
      doc.text(String(val), MX+46, y);
      y += 5;
    });
    y += 3;

    // ── Tabela de itens ──
    const colX = { n:MX, desc:MX+8, qty:MX+104, unit:MX+120, tot:MX+152 };
    const colW = { n:8, desc:96, qty:16, unit:32, tot:COL_W-(152-MX+MX) };

    // Cabeçalho da tabela
    doc.setFillColor(...AZUL);
    doc.rect(MX, y-4, COL_W, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('#',        colX.n+2,   y);
    doc.text('Descrição',colX.desc+1,y);
    doc.text('Qtd',      colX.qty+7, y, {align:'right'});
    doc.text('V. Unit.', colX.unit+31,y, {align:'right'});
    doc.text('V. Total', MX+COL_W-1, y, {align:'right'});
    y += 5;

    // Linhas
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const FOOTER_RESERVE = 55;

    (orc.items||[]).forEach((item, i) => {
      const descLines = doc.splitTextToSize(item.desc||'', 94);
      const rowH = Math.max(6.5, descLines.length * 4.5);

      if (y + rowH > PAGE_H - FOOTER_RESERVE) {
        doc.addPage();
        y = drawHeader(doc, numStr);
        // Re-desenha cabeçalho da tabela na nova página
        doc.setFillColor(...AZUL);
        doc.rect(MX, y-4, COL_W, 7, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
        doc.text('#',        colX.n+2,   y);
        doc.text('Descrição',colX.desc+1,y);
        doc.text('Qtd',      colX.qty+7, y, {align:'right'});
        doc.text('V. Unit.', colX.unit+31,y,{align:'right'});
        doc.text('V. Total', MX+COL_W-1, y, {align:'right'});
        y += 5;
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      }

      if (i%2===0) { doc.setFillColor(235,242,255); doc.rect(MX,y-3.5,COL_W,rowH,'F'); }
      else         { doc.setFillColor(248,248,248);  doc.rect(MX,y-3.5,COL_W,rowH,'F'); }

      doc.setTextColor(30,30,30);
      doc.text(String(i+1),          colX.n+2,      y);
      doc.text(descLines,            colX.desc+1,   y);
      doc.text(String(item.qty),     colX.qty+7,    y, {align:'right'});
      doc.text(fBRL(item.unit),      colX.unit+31,  y, {align:'right'});
      doc.text(fBRL(item.total),     MX+COL_W-1,    y, {align:'right'});

      doc.setDrawColor(200,215,240); doc.setLineWidth(0.15);
      doc.line(MX, y+rowH-3, MX+COL_W, y+rowH-3);
      y += rowH;
    });

    y += 4;

    // ── Total ──
    if (y > PAGE_H - FOOTER_RESERVE) { doc.addPage(); y = drawHeader(doc, numStr); }
    doc.setFillColor(...AZUL);
    doc.rect(MX, y-4, COL_W, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text('TOTAL GERAL:', MX+4, y+2);
    doc.text(fBRL(orc.total), MX+COL_W-1, y+2, {align:'right'});
    y += 13;

    // Extenso
    if (typeof valorExtenso === 'function') {
      doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(80,80,80);
      const ext = doc.splitTextToSize('('+valorExtenso(orc.total)+')', COL_W);
      doc.text(ext, MX+COL_W-1, y, {align:'right'});
      y += ext.length*3.5 + 3;
    }

    // ── Banco ──
    if (y > PAGE_H - 35) { doc.addPage(); y = drawHeader(doc, numStr); }
    doc.setFillColor(230,238,255);
    doc.rect(MX, y, COL_W, 17, 'F');
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.rect(MX,y,COL_W,17,'S');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...AZUL);
    doc.text('Dados Bancários:', MX+3, y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(40,40,40);
    const bancoLines = doc.splitTextToSize(BANCO_INFO, COL_W-6);
    doc.text(bancoLines, MX+3, y+10);
    y += 20;

    // ── Observação ──
    doc.setDrawColor(200,210,230); doc.setLineWidth(0.3); doc.line(MX,y,MX+COL_W,y);
    y += 4;
    doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(110,110,120);
    const obs = '* Após a aprovação não nos responsabilizamos por erros do Cliente. Por não gostar da arte ou até mesmo erro de digitação. Deixando ciente que o cliente receberá o material para aprovação do mesmo e sendo aprovado será enviado para confecção do mesmo.';
    doc.text(doc.splitTextToSize(obs, COL_W), MX, y);

    doc.save('Orcamento_'+String(orc.num).padStart(3,'0')+'_'+((orc.nome||'').replace(/[^a-zA-Z0-9À-ÿ]/g,'_'))+'.pdf');
  }

  // ── DOCX (via Blob com XML Word) ───────────────────────
  async function gerarDOCX(orc) {
    const numStr = 'N° ' + String(orc.num).padStart(3,'0');

    // Constrói o XML do documento Word manualmente
    const rows = (orc.items||[]).map((item,i) => {
      const bg = i%2===0 ? 'EBF2FF' : 'F8F8F8';
      return `<w:tr>
        <w:tc><w:tcPr><w:shd w:fill="${bg}" w:val="clear"/><w:tcW w:w="400" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${i+1}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:fill="${bg}" w:val="clear"/><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xmlEsc(item.desc)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:fill="${bg}" w:val="clear"/><w:tcW w:w="700" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${item.qty}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:fill="${bg}" w:val="clear"/><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${xmlEsc(fBRL(item.unit))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:shd w:fill="${bg}" w:val="clear"/><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${xmlEsc(fBRL(item.total))}</w:t></w:r></w:p></w:tc>
      </w:tr>`;
    }).join('');

    const extTotal = typeof valorExtenso==='function' ? valorExtenso(orc.total) : '';

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>

  <!-- CABEÇALHO: Logo e título -->
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="003399"/><w:sz w:val="36"/></w:rPr>
      <w:t>LOOK — Imprimindo Ideias</w:t></w:r>
  </w:p>
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="555555"/></w:rPr>
      <w:t>@lookideiasbr | lookideiasbr</w:t></w:r>
  </w:p>

  <!-- Linha azul -->
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="003399"/></w:pBdr><w:spacing w:after="120"/></w:pPr></w:p>

  <!-- ORÇAMENTO + NÚMERO -->
  <w:p>
    <w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1a1a1a"/></w:rPr><w:t xml:space="preserve">ORÇAMENTO   </w:t></w:r>
    <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="003399"/></w:rPr><w:t>${xmlEsc(numStr)}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="003399"/></w:pBdr><w:spacing w:after="160"/></w:pPr></w:p>

  <!-- DADOS DO CLIENTE -->
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="003399"/><w:sz w:val="20"/></w:rPr><w:t>DADOS DO CLIENTE</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Nome: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${xmlEsc(orc.nome||'—')}</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Comércio/Projeto: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${xmlEsc(orc.comercio||'—')}</w:t></w:r></w:p>

  <!-- PROPOSTA -->
  <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:color w:val="003399"/><w:sz w:val="20"/></w:rPr><w:t>NOSSA PROPOSTA DE PREÇO</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Prazo de Entrega: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${xmlEsc(orc.prazo||'—')}</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Orçamento Válido: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${xmlEsc(orc.validade||'—')}</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">Forma de Pagamento: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${xmlEsc(orc.pagamento||'—')}</w:t></w:r></w:p>

  <!-- TABELA DE ITENS -->
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9100" w:type="dxa"/>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:color="003399"/>
        <w:bottom w:val="single" w:sz="4" w:color="003399"/>
        <w:left   w:val="single" w:sz="4" w:color="003399"/>
        <w:right  w:val="single" w:sz="4" w:color="003399"/>
        <w:insideH w:val="single" w:sz="2" w:color="C8D8FF"/>
        <w:insideV w:val="single" w:sz="2" w:color="C8D8FF"/>
      </w:tblBorders>
    </w:tblPr>
    <!-- Cabeçalho da tabela -->
    <w:tr>
      <w:tc><w:tcPr><w:shd w:fill="003399" w:val="clear"/><w:tcW w:w="400" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>#</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:fill="003399" w:val="clear"/><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>
        <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Descrição</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:fill="003399" w:val="clear"/><w:tcW w:w="700" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Qtd</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:fill="003399" w:val="clear"/><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>V. Unit.</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:shd w:fill="003399" w:val="clear"/><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>V. Total</w:t></w:r></w:p></w:tc>
    </w:tr>
    ${rows}
  </w:tbl>

  <!-- TOTAL -->
  <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="140" w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="003399"/></w:rPr><w:t xml:space="preserve">TOTAL GERAL: </w:t></w:r>
    <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>${xmlEsc(fBRL(orc.total))}</w:t></w:r></w:p>
  <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="160"/></w:pPr>
    <w:r><w:rPr><w:i/><w:sz w:val="17"/><w:color w:val="666666"/></w:rPr>
      <w:t>(${xmlEsc(extTotal)})</w:t></w:r></w:p>

  <!-- DADOS BANCÁRIOS -->
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9100" w:type="dxa"/>
      <w:tblBorders><w:top w:val="single" w:sz="4" w:color="003399"/>
        <w:bottom w:val="single" w:sz="4" w:color="003399"/>
        <w:left w:val="single" w:sz="4" w:color="003399"/>
        <w:right w:val="single" w:sz="4" w:color="003399"/></w:tblBorders>
      <w:shd w:fill="EBF2FF" w:val="clear"/>
    </w:tblPr>
    <w:tr>
      <w:tc><w:tcPr><w:shd w:fill="EBF2FF" w:val="clear"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="003399"/><w:sz w:val="18"/></w:rPr><w:t>Dados Bancários:</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:sz w:val="17"/></w:rPr><w:t>${xmlEsc(BANCO_INFO)}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>

  <!-- OBSERVAÇÃO -->
  <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="2" w:color="CCCCCC"/></w:pBdr><w:spacing w:before="120" w:after="40"/></w:pPr>
    <w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="888888"/></w:rPr>
      <w:t>* Após a aprovação não nos responsabilizamos por erros do Cliente. Por não gostar da arte ou até mesmo erro de digitação. Deixando ciente que o cliente receberá o material para aprovação do mesmo e sendo aprovado será enviado para confecção do mesmo.</w:t></w:r></w:p>

  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
  </w:sectPr>
</w:body>
</w:document>`;

    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
      <w:sz w:val="20"/><w:szCs w:val="20"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    // Monta o ZIP do DOCX
    const { JSZip } = window;
    if (!JSZip) throw new Error('JSZip não carregado. Necessário para gerar DOCX.');

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rootRels);
    zip.file('word/document.xml', docXml);
    zip.file('word/styles.xml', styles);
    zip.file('word/_rels/document.xml.rels', rels);

    const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'Orcamento_'+String(orc.num).padStart(3,'0')+'_'+((orc.nome||'').replace(/[^a-zA-Z0-9À-ÿ]/g,'_'))+'.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function xmlEsc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  return { gerarPDF, gerarDOCX };
})();
