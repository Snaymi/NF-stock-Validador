// [1] Função utilitária para buscar elementos
const getElement = (id) => document.getElementById(id);
let linhasFiltradas = []; // variável global, acessível por qualquer função

function extrairNCMDescricao(texto) { //Prepara o arquivo txt com os padrões desejados
    console.log('🔍 Extraindo apenas NCM/SH e Descrição (ignorando CEST)');

    // 1) Quebra o texto em blocos a partir do padrão de início de item (ex.: "29.2   02.002.00")
    const blocos = texto
        .split(/(?=\d{1,2}\.\d{1,2}\s+\d{2}\.\d{3}\.\d{2})/) // lookahead para não perder o delimitador
        .map(b => b.trim())
        .filter(b => b !== '');

    const resultado = [];
    const resultadoEstruturado = [];

    blocos.forEach(bloco => {
        // 2) Aplica regex para ignorar índice e CEST e capturar NCM(s) + descrição
        const match = bloco.match(/^\d{1,2}\.\d{1,2}\s+\d{2}\.\d{3}\.\d{2}\s+((?:\d{4}(?:\.\d{2}){0,2}\s*)+)\s+(.+)$/);

        if (match) {
            const ncms = match[1].trim().replace(/\./g, ''); // remove pontos dos NCMs
            const descricao = match[2].trim();
            resultado.push(`${ncms}\n${descricao}\n\n`);
            resultadoEstruturado.push({ ncm: ncms, descricao: descricao });
        } else {
            console.warn(`⚠️ Bloco fora do padrão: "${bloco}"`);
        }
    });

    return {
        texto: resultado.join(''),
        dados: resultadoEstruturado
    };
}//Exibi ⚠ para blocos fora do padrão
// [2] Função para ler PDF e extrair texto
async function lerPDF(file) { // le o arquivo pdf completo
    console.log(`📄 Iniciando leitura do PDF: ${file.name}`);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`📑 Total de páginas no PDF: ${pdf.numPages}`);

    let textoFinal = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        textoFinal += pageText + '\n';
        console.log(`✅ Página ${pageNum} processada`);
    }

    console.log('📜 Texto extraído com sucesso do PDF');
    return textoFinal;
}
function criarBotaoDownloadExcel() {
    const downloadArea = document.getElementById('download-btn-excel');
    if (document.getElementById('btn-download-excel')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-download-excel';
    btn.textContent = '📥  Baixar Excel Filtrado por NCM + CFOP 📥';
    btn.className = 'btn-download';
    btn.addEventListener('click', baixarExcelFiltrado);

    downloadArea.appendChild(btn);
}

function criarBotaoFiltrarTabela() {
    const downloadArea = document.getElementById('download-btn-excel');
    if (document.getElementById('btn-filtrar-tabela')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-filtrar-tabela';
    btn.textContent = '🔍 Aplicar Filtros e Atualizar Tabela';
    btn.className = 'btn-download';
    btn.addEventListener('click', filtrarTabelaPorNCMECFOP);

    downloadArea.appendChild(btn);
}
function criarBotaoDownloadCFOP6() {
    const downloadArea = document.getElementById('download-btn-excel');
    if (document.getElementById('btn-download-cfop6')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-download-cfop6';
    btn.textContent = '📥 Baixar somente CFOP 6 (Número + Fornecedor)';
    btn.className = 'btn-download';
    btn.addEventListener('click', baixarExcelCFOP6);

    downloadArea.appendChild(btn);
}

function baixarExcelFiltrado() {
    if (!linhasFiltradas || !linhasFiltradas.length) {
        alert('❌ Nenhum dado filtrado disponível para exportar.');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(linhasFiltradas);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtrado');
    XLSX.writeFile(workbook, 'filtrado.xlsx');
}
function baixarExcelCFOP6() {
    if (!linhasFiltradas || !linhasFiltradas.length) {
        alert('❌ Nenhum dado filtrado disponível.');
        return;
    }

    // Cabeçalho original para localizar colunas
    const cabecalho = linhasFiltradas[0].map(h => String(h || '').trim().toLowerCase());
    const idxNumero = cabecalho.findIndex(h => h === 'número' || h === 'numero');
    const idxFornecedor = cabecalho.findIndex(h => h === 'fornecedor');
    const idxCFOP = cabecalho.findIndex(h => h === 'cfop');

    if (idxNumero === -1 || idxFornecedor === -1 || idxCFOP === -1) {
        alert('❌ Colunas necessárias não encontradas (Número, Fornecedor ou CFOP).');
        return;
    }

    // Monta nova tabela apenas com CFOP 6
    const novaTabela = [["Número", "Fornecedor"]];
    linhasFiltradas.slice(1).forEach(linha => {
        const cfop = String(linha[idxCFOP] || '').trim();
        if (cfop.startsWith("6")) {
            novaTabela.push([linha[idxNumero], linha[idxFornecedor]]);
        }
    });

    if (novaTabela.length === 1) {
        alert('⚠️ Nenhuma linha encontrada com CFOP 6.');
        return;
    }

    // Exporta novo Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(novaTabela);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CFOP6');
    XLSX.writeFile(workbook, 'CFOP6_Notas.xlsx');
}

function filtrarTabelaPorNCMECFOP() {
    if (!window.listaNCMs || !window.listaNCMs.length) {
        alert('❌ Nenhum NCM extraído do PDF para comparar.');
        return;
    }
    if (!linhasOriginaisExcel.length) {
        alert('❌ Nenhum Excel carregado para filtrar.');
        return;
    }

    const ncmSet = new Set();
    window.listaNCMs.forEach(item => {
        item.ncm.split(/\s+/).forEach(n => {
            const limpo = n.trim().replace(/\./g, '');
            for (let i = 4; i <= 8; i++) {
                if (limpo.length >= i) ncmSet.add(limpo.substring(0, i));
            }
        });
    });

    const cabecalho = linhasOriginaisExcel[0];
    const normalizar = (txt) => String(txt || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase();

    const idxCFOP = cabecalho.findIndex(h => normalizar(h) === 'cfop');
    const idxNCM = cabecalho.findIndex(h => normalizar(h) === 'ncm');

    if (idxCFOP === -1 || idxNCM === -1) {
        alert('❌ Colunas CFOP ou NCM não encontradas.');
        return;
    }

    const filtradas = [cabecalho];
    let removidas = 0;

    linhasOriginaisExcel.slice(1).forEach(linha => {
        const cfop = String(linha[idxCFOP] || '').trim();
        const ncmLinha = String(linha[idxNCM] || '').trim().replace(/\./g, '');

        let ncmValido = false;
        for (let i = 8; i >= 4; i--) {
            if (ncmSet.has(ncmLinha.substring(0, i))) {
                ncmValido = true;
                break;
            }
        }

        if (!ncmValido) {
            removidas++;
            return;
        }

        if (cfop.startsWith('5')) {
            filtradas.push(linha);
        } else if (cfop.startsWith('6')) {
            filtradas.push([]);
            filtradas.push(linha);
            filtradas.push([]);
        }
    });

    // Atualiza a tabela na tela
    exibirTabelaFiltrada(filtradas);
    linhasFiltradas = filtradas; // salva para exportação



    console.log(`✅ Tabela atualizada. ${removidas} linha(s) removida(s por NCM).`);

    // 🚀 Aplica também o filtro das NF-es (vBCST = 0) se existir
    if (window.nfesSemST && window.nfesSemST.length > 0) {
        filtrarTabelaPorNotasST();
        console.log("✅ Filtro NF-e reaplicado após o filtro de NCM/CFOP.");
    }
}


let linhasOriginaisExcel = []; // guarda o conteúdo original para exportação
// Lê o Excel e exibe como tabela
async function lerExcel(file) {
    console.log(`📊 Lendo Excel: ${file.name}`);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const primeiraAba = workbook.SheetNames[0];
    const sheet = workbook.Sheets[primeiraAba];

    const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    linhasOriginaisExcel = linhas;
    console.log(`📄 Total de linhas: ${linhas.length}`);

    exibirTabelaFiltrada(linhas);
    criarBotaoFiltrarTabela();
    criarBotaoDownloadExcel();
    criarBotaoDownloadCFOP6();

    // 🚀 Se já tiver NF-es válidas, aplica automaticamente o filtro final
    if (window.nfesSemST && window.nfesSemST.length > 0) {
        filtrarTabelaPorNotasST();
        alert(`✅ Excel filtrado automaticamente com NF-es válidas (vBCST = 0).
Total aceitas: ${window.nfesSemST.length}`);
    }
}

function exibirTabelaFiltrada(linhas) {
    const tabelaArea = document.getElementById('tabela-area');
    tabelaArea.innerHTML = ''; // limpa conteúdo anterior

    if (linhas.length === 0) {
        console.warn("⚠️ Planilha vazia");
        return;
    }

    // Cabeçalho (primeira linha)
    const cabecalho = linhas[0].map(h => String(h || '').trim().toLowerCase());

    // Localiza índices das colunas (podem ser -1 se não existirem)
    const idxNCM = cabecalho.findIndex(h => h === 'ncm');
    const idxCFOP = cabecalho.findIndex(h => h === 'cfop');
    const idxNumber = cabecalho.findIndex(h => h === 'número' || h === 'numero');
    const idxFornecedor = cabecalho.findIndex(h => h === 'fornecedor');
    const idxDescricao = cabecalho.findIndex(h => h === 'produto' || h === 'descrição' || h === 'descricao');

    // Aviso se faltar alguma coluna
    const faltando = [];
    if (idxNCM === -1) faltando.push('NCM');
    if (idxCFOP === -1) faltando.push('CFOP');
    if (idxNumber === -1) faltando.push('Número');
    if (idxFornecedor === -1) faltando.push('Fornecedor');
    if (idxDescricao === -1) faltando.push('Descrição');

    if (faltando.length) {
        console.warn(`⚠️ Colunas não encontradas: ${faltando.join(', ')} — exibindo apenas as disponíveis`);
    }

    // Lista de colunas que realmente existem
    const colunasParaExibir = [
        { idx: idxNumber, nome: 'Número' },
        { idx: idxFornecedor, nome: 'Fornecedor' },
        { idx: idxDescricao, nome: 'Descrição' },
        { idx: idxNCM, nome: 'NCM' },
        { idx: idxCFOP, nome: 'CFOP' }
    ].filter(c => c.idx !== -1);

    const tabela = document.createElement('table');
    tabela.className = 'tabela-excel';

    linhas.forEach((linha, index) => {
        const tr = document.createElement('tr');

        colunasParaExibir.forEach(col => {
            const td = document.createElement(index === 0 ? 'th' : 'td');
            td.textContent = linha[col.idx] !== undefined ? linha[col.idx] : '';

            // Destacar CFOP que começa com "6"
            if (index > 0 && col.nome === 'CFOP') {
                if (String(linha[col.idx]).startsWith('6')) {
                    td.classList.add('cfop-destacado');
                }
            }

            tr.appendChild(td);
        });

        tabela.appendChild(tr);
    });

    tabelaArea.appendChild(tabela);
}


function filtrarExcelPorNCM() {
    if (!window.listaNCMs || !window.listaNCMs.length) {
        alert('Nenhum NCM extraído do PDF para comparar.');
        return;
    }
    if (!linhasOriginaisExcel.length) {
        alert('Nenhum Excel carregado para filtrar.');
        return;
    }

    // 🔹 Cria Sets para 8, 7, 6, 5 e 4 dígitos
    const ncmSet8 = new Set();
    const ncmSet7 = new Set();
    const ncmSet6 = new Set();
    const ncmSet5 = new Set();
    const ncmSet4 = new Set();

    window.listaNCMs.forEach(item => {
        item.ncm.split(/\s+/).forEach(n => {
            const ncmLimpo = n.trim().replace(/\./g, '');
            if (ncmLimpo.length >= 8) ncmSet8.add(ncmLimpo.substring(0, 8));
            if (ncmLimpo.length >= 7) ncmSet7.add(ncmLimpo.substring(0, 7));
            if (ncmLimpo.length >= 6) ncmSet6.add(ncmLimpo.substring(0, 6));
            if (ncmLimpo.length >= 5) ncmSet5.add(ncmLimpo.substring(0, 5));
            if (ncmLimpo.length >= 4) ncmSet4.add(ncmLimpo.substring(0, 4));
        });
    });

    // Localiza índices da coluna NCM e Descrição no Excel
    const cabecalho = linhasOriginaisExcel[0].map(h => String(h || '').trim().toLowerCase());
    const idxNCM = cabecalho.findIndex(h => h === 'ncm');
    const idxDescricao = cabecalho.findIndex(h => h === 'descrição' || h === 'descricao' || h === 'produto');

    if (idxNCM === -1) {
        alert('Coluna NCM não encontrada no Excel.');
        return;
    }

    // Filtra linhas e coleta removidos
    const filtradas = [linhasOriginaisExcel[0]];
    const removidosLista = [];
    let removidas = 0;

    linhasOriginaisExcel.slice(1).forEach(linha => {
        const ncmLinha = String(linha[idxNCM] || '').trim().replace(/\./g, '');
        const n8 = ncmLinha.substring(0, 8);
        const n7 = ncmLinha.substring(0, 7);
        const n6 = ncmLinha.substring(0, 6);
        const n5 = ncmLinha.substring(0, 5);
        const n4 = ncmLinha.substring(0, 4);

        if (
            ncmSet8.has(n8) ||
            ncmSet7.has(n7) ||
            ncmSet6.has(n6) ||
            ncmSet5.has(n5) ||
            ncmSet4.has(n4)
        ) {
            filtradas.push(linha);
        } else {
            removidas++;
            removidosLista.push({
                ncm: ncmLinha,
                descricao: idxDescricao !== -1 ? linha[idxDescricao] : '(sem descrição)'
            });
        }
    });

    // Atualiza tabela exibida
    exibirTabelaFiltrada(filtradas);

    // Mensagem para o usuário
    alert(`✅ Filtragem concluída. ${removidas} linha(s) removida(s) do Excel.`);

    // 🔹 Log no console dos removidos
    console.log("❌ NCMs removidos:");
    console.table(removidosLista);

    // 🔹 Cria e baixa o Excel filtrado
    // const ws = XLSX.utils.aoa_to_sheet(filtradas);
    // const wb = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, 'Filtrado por NCM');
    // XLSX.writeFile(wb, 'Excel_Filtrado_Por_NCM.xlsx');
}

function filtrarTabelaPorNotasST() {
    if (!window.nfesSemST || !window.nfesSemST.length) {
        alert("❌ Nenhuma NF-e válida carregada (vBCST = 0).");
        return;
    }

    if (!linhasOriginaisExcel.length) {
        alert("❌ Nenhum Excel carregado para filtrar.");
        return;
    }

    // Cabeçalho
    const cabecalho = linhasOriginaisExcel[0].map(h => String(h || '').trim().toLowerCase());
    const idxNumero = cabecalho.findIndex(h => h === 'número' || h === 'numero');

    if (idxNumero === -1) {
        alert("❌ Coluna 'Número' não encontrada no Excel.");
        return;
    }

    // Mantém apenas as linhas cujo Número está nas NFEs válidas
    const filtradas = [linhasOriginaisExcel[0]];
    let removidas = 0;

    linhasOriginaisExcel.slice(1).forEach(linha => {
        const numero = String(linha[idxNumero] || '').trim();
        if (window.nfesSemST.includes(numero)) {
            filtradas.push(linha);
        } else {
            removidas++;
        }
    });

    exibirTabelaFiltrada(filtradas);
    linhasFiltradas = filtradas;

    console.log(`✅ Filtro NF-e aplicado: ${filtradas.length - 1} linha(s) válidas, ${removidas} removida(s).`);
}
// [3] Função para criar botão de download do TXT - antigo
// exibir o texto extraído do PDF no console.log
function exibirTexto(texto) {
    const blob = new Blob([texto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    console.log('Conteúdo TXT gerado:', texto);
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = 'Arquivo-convertido.txt';
    // link.textContent = '📥 Baixar arquivo convertido .txt 📥';
    // link.className = 'btn-download';

    // const downloadArea = document.getElementById('download-btn-txt');
    // downloadArea.innerHTML = '';
    // downloadArea.appendChild(link);

}


// [4] Registra listeners nos botões e inputs
const addButtonListeners = function () {
    console.log('✅ NF-STOCK pronto para receber arquivos');

    const buttonInputMap = new Map([
        ['btn-arquivo', 'file-input'],     // Excel
        ['btn-arquivo2', 'file-input2']    // PDF
    ]);

    buttonInputMap.forEach(function (inputId, btnId) {
        const btn = getElement(btnId);
        const input = getElement(inputId);

        if (!btn || !input) { //se pelo menos um dos dois não existir entre no bloco if.
            console.warn(`⚠️ Elementos ausentes para o par: botão="${btnId}", input="${inputId}".`);
            return;
        }

        btn.addEventListener('click', function () {
            console.log(`🖱️ Botão "${btnId}" clicado`);
            input.click();
        });

        input.addEventListener('change', async function () {
            const file = input.files && input.files[0];
            if (!file) {
                console.warn(`⚠️ Nenhum arquivo selecionado para ${btnId}`);
                return;
            }
            //aceita somente PDF
            if (btnId === 'btn-arquivo2' && file.type !== 'application/pdf') {
                alert('❌ Por favor, selecione um arquivo PDF válido.');
                input.value = ''; // Reseta o input
                return;
            }

            try {
                if (btnId === 'btn-arquivo') {
                    // Aqui você processa o Excel normalmente
                    console.log(`📊 Arquivo Excel recebido: ${file.name}`);
                    await lerExcel(file);
                    // let rows = await lerExcel(file);
                    // ...processamento do Excel
                } else {
                    console.log(`📄 Arquivo PDF recebido: ${file.name}`);

                    // 1) Extrai texto bruto do PDF
                    const textoExtraido = await lerPDF(file);

                    // 2) Extrai nos dois formatos: texto final e dados estruturados
                    const { texto, dados } = extrairNCMDescricao(textoExtraido);

                    // 3) Mostra no console de forma legível
                    console.log('📦 Dados estruturados:');
                    console.table(dados);

                    // 4) Gera botão de download com o TXT final
                    exibirTexto(texto);

                    // 5) (Opcional) Salva para uso posterior
                    window.listaNCMs = dados;
                }
            } catch (err) {
                console.error(`❌ Erro processando o arquivo ${file.name}:`, err);
            }

        });
    });
};

// [5] Inicializa quando o DOM estiver pronto
//main.js
document.getElementById('btn-filtrar-ncm').addEventListener('click', filtrarExcelPorNCM);

document.addEventListener('DOMContentLoaded', addButtonListeners);

